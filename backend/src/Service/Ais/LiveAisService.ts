import {Logger, ServiceAbstract} from 'figtree';
import {ServiceStatus} from 'figtree-schemas';
import {WebSocket} from 'ws';
import {AisVesselRepository} from '../../Db/MariaDb/Repositories/AisVesselRepository.js';
import {LiveAisTrackRepository} from '../../Db/MariaDb/Repositories/LiveAisTrackRepository.js';
import {AisConfig, AisSettings} from './AisSettings.js';
import {flagFromMmsi} from './Mid.js';

/**
 * AISStream.io WebSocket endpoint.
 */
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';

/**
 * AIS message types we ingest. The provider's `MessageType` field
 * uses these names (camelCase, full words).
 *   - PositionReport: classes A (1, 2, 3) + ShipStaticData live here for class A
 *   - StandardClassBPositionReport: class B short (18)
 *   - ExtendedClassBPositionReport: class B extended (19)
 *   - ShipStaticData: class A static (5)
 *   - StaticDataReport: class B static (24)
 */
type AisStreamMessage = {
    MessageType?: string;
    MetaData?: {
        MMSI?: number;
        ShipName?: string;
        latitude?: number;
        longitude?: number;
        time_utc?: string;
    };
    Message?: Record<string, unknown>;
};

/**
 * Last seen state for one MMSI — used by the downsampling decision
 * to avoid hitting the DB for every ping.
 */
type LastState = {
    last_inserted_at: number;
    last_sog: number | null;
    last_cog: number | null;
};

/**
 * Long-running ingest service: holds an open WebSocket to
 * AISStream.io, downsamples incoming position reports, and writes
 * survivors to `live_ais_track`. Static AIS messages upsert to
 * `ais_vessel`.
 *
 * Implementation notes:
 *
 * - Not a ServiceJobAbstract (no cron tick). Extends ServiceAbstract
 *   so the ServiceManager owns lifecycle (start/stop visible in the
 *   Services admin page) but the runtime is event-driven.
 *
 * - API key from `MWPA_AISSTREAM_TOKEN` env var; absence → service
 *   self-disables and logs once. Same pattern as GfwProvider.
 *
 * - Auto-reconnect on socket close / error with exponential backoff
 *   capped at 60 s. Configuration changes (bbox, downsample params)
 *   require a manual restart from the Services page — the WebSocket
 *   subscription is fixed at connect time.
 *
 * - In-memory per-MMSI cache keyed by mmsi. Cache entries don't
 *   expire (memory stays bounded by the number of distinct vessels
 *   ever seen — ~150 in the Canaries area = trivial).
 */
export class LiveAisService extends ServiceAbstract {

    public static readonly NAME = 'live-ais';

    public static readonly TOKEN_ENV_VAR = 'MWPA_AISSTREAM_TOKEN';

    /** Reconnect backoff doubles per attempt up to this ceiling. */
    private static readonly MAX_BACKOFF_MS = 60_000;

    private static readonly BASE_BACKOFF_MS = 1_000;

    /**
     * Wider ceiling used while the server cert is expired (or the TLS
     * handshake fails for any non-recoverable reason). Re-trying every
     * 60 s is pointless if the upstream broke their Let's-Encrypt
     * renewal — they need hours to react, and the per-minute log
     * trilogy (error/close/reconnecting) drowns everything else.
     */
    private static readonly TLS_FAIL_BACKOFF_MS = 30 * 60 * 1000;

    /**
     * Error codes / message fragments that signal an unrecoverable TLS
     * issue server-side and should fall back to the wider backoff.
     */
    private static readonly TLS_FAIL_CODES = new Set([
        'CERT_HAS_EXPIRED',
        'UNABLE_TO_GET_ISSUER_CERT',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'DEPTH_ZERO_SELF_SIGNED_CERT'
    ]);

    private readonly _token: string;

    private _config: AisConfig | null = null;

    private _ws: WebSocket | null = null;

    private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    private _backoffAttempt: number = 0;

    private _shuttingDown: boolean = false;

    /**
     * Last socket error message — surfaced via `_statusMsg` so the
     * Services admin page shows *why* we are stuck reconnecting
     * (e.g. "certificate has expired") instead of just "error".
     * @private
     */
    private _lastError: string = '';

    /**
     * Node TLS error code (e.g. `CERT_HAS_EXPIRED`) extracted from the
     * `error` event. Used to widen the reconnect backoff while a known
     * unrecoverable TLS issue persists.
     * @private
     */
    private _lastErrorCode: string = '';

    private readonly _lastByMmsi: Map<string, LastState> = new Map();

    public constructor() {
        super(LiveAisService.NAME, ['mariadb']);
        this._token = (process.env[LiveAisService.TOKEN_ENV_VAR] ?? '').trim();
    }

    public override async start(): Promise<void> {
        const logger = Logger.getLogger();

        if (this._token === '') {
            logger.info(`LiveAisService: disabled — no ${LiveAisService.TOKEN_ENV_VAR} env var set`);
            this._status = ServiceStatus.None;
            this._statusMsg = `disabled — no ${LiveAisService.TOKEN_ENV_VAR} env var set`;
            return;
        }

        this._config = await AisSettings.load();

        if (!this._config.enabled) {
            logger.info('LiveAisService: disabled by ais_config.enabled=false');
            this._status = ServiceStatus.None;
            this._statusMsg = 'disabled by ais_config.enabled=false';
            return;
        }

        this._shuttingDown = false;
        this._status = ServiceStatus.Progress;
        this._statusMsg = 'connecting…';
        await this._connect();
    }

    public override async stop(): Promise<void> {
        this._shuttingDown = true;

        if (this._reconnectTimer !== null) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        if (this._ws) {
            try {
                this._ws.close();
            } catch {
                /* ignore */
            }
            this._ws = null;
        }

        this._status = ServiceStatus.None;
        this._statusMsg = 'stopped';
    }

    /**
     * Open the WebSocket and send the initial subscription frame.
     * On error / unexpected close, schedule a reconnect with backoff.
     * @private
     */
    private async _connect(): Promise<void> {
        const logger = Logger.getLogger();

        if (this._config === null) {
            return;
        }

        const config = this._config;
        const ws = new WebSocket(AISSTREAM_URL);

        ws.on('open', () => {
            logger.info('LiveAisService: WebSocket open — sending subscription');
            this._backoffAttempt = 0;
            this._lastError = '';
            this._lastErrorCode = '';

            const subscription = {
                APIKey: this._token,
                BoundingBoxes: [[
                    [config.bbox_min_lat, config.bbox_min_lon],
                    [config.bbox_max_lat, config.bbox_max_lon]
                ]],
                FilterMessageTypes: [
                    'PositionReport',
                    'StandardClassBPositionReport',
                    'ExtendedClassBPositionReport',
                    'ShipStaticData',
                    'StaticDataReport'
                ]
            };
            ws.send(JSON.stringify(subscription));

            this._status = ServiceStatus.Success;
            this._statusMsg = `connected — bbox [${config.bbox_min_lat},${config.bbox_min_lon}]..[${config.bbox_max_lat},${config.bbox_max_lon}]`;
        });

        ws.on('message', (raw) => {
            const text = raw.toString();
            // Provider sometimes sends keep-alive frames as plain
            // non-JSON; ignore parse failures silently.
            let msg: AisStreamMessage;
            try {
                msg = JSON.parse(text) as AisStreamMessage;
            } catch {
                return;
            }
            this._handleMessage(msg).catch((e) => {
                logger.warn(`LiveAisService: message handler failed — ${(e as Error).message}`);
            });
        });

        ws.on('close', (code, reason) => {
            const reasonStr = reason.toString();
            logger.warn(`LiveAisService: WebSocket closed (code=${code}) — ${reasonStr}`);
            this._ws = null;
            this._status = ServiceStatus.Error;
            // Prefer the 'error' message (more specific, e.g. "certificate
            // has expired") over the close reason which is usually empty
            // when the close was triggered by a TLS failure.
            const detail = this._lastError !== '' ? this._lastError : (reasonStr || `code=${code}`);
            this._statusMsg = `disconnected — ${detail}`;
            this._scheduleReconnect();
        });

        ws.on('error', (err) => {
            const code = (err as Error & {code?: string}).code ?? '';
            logger.warn(`LiveAisService: WebSocket error — ${err.message}`);
            this._lastError = err.message;
            this._lastErrorCode = code;
            // 'error' will be followed by 'close' — reconnect happens there.
        });

        this._ws = ws;
    }

    private _scheduleReconnect(): void {
        if (this._shuttingDown) {
            return;
        }

        // Pick the ceiling: when the last failure was a known
        // unrecoverable TLS issue (typically expired upstream cert),
        // use the wider 30 min cap. Retrying every minute is wasted
        // work — these problems take hours of operator action upstream
        // to fix, and the log flood obscures everything else.
        const isTlsFailure = this._lastErrorCode !== ''
            && LiveAisService.TLS_FAIL_CODES.has(this._lastErrorCode);
        const ceiling = isTlsFailure
            ? LiveAisService.TLS_FAIL_BACKOFF_MS
            : LiveAisService.MAX_BACKOFF_MS;

        const backoff = Math.min(
            LiveAisService.BASE_BACKOFF_MS * Math.pow(2, this._backoffAttempt),
            ceiling
        );
        this._backoffAttempt++;

        Logger.getLogger().info(`LiveAisService: reconnecting in ${backoff} ms (attempt ${this._backoffAttempt})`);

        const detail = this._lastError !== '' ? this._lastError : 'unknown';
        this._status = ServiceStatus.Error;
        this._statusMsg = `reconnect attempt ${this._backoffAttempt} in ${Math.round(backoff / 1000)}s — ${detail}`;

        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this._connect().catch((e) => {
                const msg = (e as Error).message;
                Logger.getLogger().warn(`LiveAisService: reconnect failed — ${msg}`);
                this._lastError = msg;
                this._scheduleReconnect();
            });
        }, backoff);
    }

    /**
     * Dispatch one parsed AIS message: position → downsample + insert,
     * static → upsert. Provider's `MessageType` decides the path.
     * @private
     */
    private async _handleMessage(msg: AisStreamMessage): Promise<void> {
        const type = msg.MessageType;
        if (!type || !msg.MetaData) {
            return;
        }

        const mmsi = msg.MetaData.MMSI;
        if (typeof mmsi !== 'number') {
            return;
        }
        const mmsiStr = `${mmsi}`;

        if (
            type === 'PositionReport'
            || type === 'StandardClassBPositionReport'
            || type === 'ExtendedClassBPositionReport'
        ) {
            await this._handlePosition(mmsiStr, msg);
        } else if (type === 'ShipStaticData' || type === 'StaticDataReport') {
            await this._handleStatic(mmsiStr, msg);
        }
    }

    /**
     * Position report path: extract fields, run downsampling, write
     * if survived.
     * @private
     */
    private async _handlePosition(mmsi: string, msg: AisStreamMessage): Promise<void> {
        const config = this._config;
        if (config === null) {
            return;
        }

        const meta = msg.MetaData!;
        const payload = (msg.Message ?? {}) as Record<string, unknown>;

        // Coordinates live in MetaData for AISStream; fall back to
        // Message for safety since they don't always populate MetaData.
        const lat = (typeof meta.latitude === 'number' ? meta.latitude : (payload.Latitude as number));
        const lon = (typeof meta.longitude === 'number' ? meta.longitude : (payload.Longitude as number));
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            return;
        }

        // Find the position-report payload — its key shape depends on
        // class (A vs B) but the fields are consistent enough.
        const positionPayload = this._findPositionPayload(msg);

        const sog = LiveAisService._parseSog(positionPayload);
        const cog = LiveAisService._parseCog(positionPayload);
        const shipType = LiveAisService._parseShipType(positionPayload);

        const nowSec = Math.floor(Date.now() / 1000);

        // Downsample decision: skip if too soon AND speed/heading
        // didn't change significantly. First-ever ping always
        // survives (no `last` to compare against).
        const last = this._lastByMmsi.get(mmsi);
        if (last) {
            const dt = nowSec - last.last_inserted_at;
            if (dt < config.downsample_seconds) {
                const sogDelta = sog !== null && last.last_sog !== null
                    ? Math.abs(sog - last.last_sog) : 0;
                const cogDelta = cog !== null && last.last_cog !== null
                    ? this._headingDelta(cog, last.last_cog) : 0;

                if (sogDelta < config.downsample_sog_delta_kn
                    && cogDelta < config.downsample_cog_delta_deg) {
                    return;
                }
            }
        }

        try {
            await LiveAisTrackRepository.getInstance().insertPing({
                mmsi,
                lat,
                lon,
                sog,
                cog,
                ship_type: shipType,
                received_at: nowSec
            });
        } catch (e) {
            Logger.getLogger().warn(`LiveAisService: insert failed for ${mmsi} — ${(e as Error).message}`);
            return;
        }

        this._lastByMmsi.set(mmsi, {
            last_inserted_at: nowSec,
            last_sog: sog,
            last_cog: cog
        });

        // Drive-by name capture: AISStream sometimes attaches ShipName
        // to MetaData on position reports. Free metadata, log it.
        const shipName = meta.ShipName;
        if (typeof shipName === 'string' && shipName.trim() !== '') {
            const flag = flagFromMmsi(mmsi);
            await AisVesselRepository.getInstance().upsertByMmsi({
                mmsi,
                name: shipName.replace(/@/gu, '').trim(),
                flag,
                ship_type: shipType
            }, nowSec).catch(() => undefined);
        }
    }

    /**
     * Static data path: upsert vessel metadata (name, callsign,
     * dimensions, IMO).
     * @private
     */
    private async _handleStatic(mmsi: string, msg: AisStreamMessage): Promise<void> {
        const payload = (msg.Message ?? {}) as Record<string, unknown>;
        // AISStream nests by message-type key — find the inner payload.
        const inner = this._findStaticPayload(msg) ?? payload;

        const name = typeof inner.Name === 'string'
            ? (inner.Name as string).replace(/@/gu, '').trim()
            : '';
        const callsign = typeof inner.CallSign === 'string'
            ? (inner.CallSign as string).replace(/@/gu, '').trim()
            : '';
        const imo = typeof inner.ImoNumber === 'number' && inner.ImoNumber > 0
            ? `${inner.ImoNumber}`
            : '';
        const shipType = typeof inner.Type === 'number' ? (inner.Type as number) : null;

        const dims = inner.Dimension as {A?: number; B?: number; C?: number; D?: number} | undefined;
        const length = dims && typeof dims.A === 'number' && typeof dims.B === 'number'
            ? Math.round(dims.A + dims.B)
            : null;
        const beam = dims && typeof dims.C === 'number' && typeof dims.D === 'number'
            ? Math.round(dims.C + dims.D)
            : null;

        const flag = flagFromMmsi(mmsi);
        const nowSec = Math.floor(Date.now() / 1000);

        try {
            await AisVesselRepository.getInstance().upsertByMmsi({
                mmsi,
                imo,
                name,
                callsign,
                ship_type: shipType,
                flag,
                length_m: length,
                beam_m: beam
            }, nowSec);
        } catch (e) {
            Logger.getLogger().warn(`LiveAisService: vessel upsert failed for ${mmsi} — ${(e as Error).message}`);
        }
    }

    private _findPositionPayload(msg: AisStreamMessage): Record<string, unknown> {
        const m = (msg.Message ?? {}) as Record<string, unknown>;
        // AISStream wraps payloads under the message-type key, e.g.
        // { Message: { PositionReport: {...} } }
        for (const key of ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport']) {
            const inner = m[key];
            if (inner && typeof inner === 'object') {
                return inner as Record<string, unknown>;
            }
        }
        return m;
    }

    private _findStaticPayload(msg: AisStreamMessage): Record<string, unknown> | null {
        const m = (msg.Message ?? {}) as Record<string, unknown>;
        for (const key of ['ShipStaticData', 'StaticDataReport']) {
            const inner = m[key];
            if (inner && typeof inner === 'object') {
                return inner as Record<string, unknown>;
            }
        }
        return null;
    }

    /**
     * Smallest absolute heading delta on the 0..360 circle. Handles
     * the 359° → 1° wrap-around (which is only 2° not 358°).
     * @private
     */
    private _headingDelta(a: number, b: number): number {
        const d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
    }

    private static _parseSog(payload: Record<string, unknown>): number | null {
        const raw = payload.Sog ?? payload.Speed;
        if (typeof raw !== 'number') {
            return null;
        }
        // AIS sentinel: 102.3 = "not available", 102.2 = ">= 102.2 kn"
        if (raw < 0 || raw >= 102.3) {
            return null;
        }
        return raw;
    }

    private static _parseCog(payload: Record<string, unknown>): number | null {
        const raw = payload.Cog ?? payload.CourseOverGround;
        if (typeof raw !== 'number') {
            return null;
        }
        // AIS sentinel: 360 = "not available"
        if (raw < 0 || raw >= 360) {
            return null;
        }
        return raw;
    }

    private static _parseShipType(payload: Record<string, unknown>): number | null {
        const raw = payload.Type ?? payload.ShipType;
        if (typeof raw !== 'number' || raw <= 0) {
            return null;
        }
        return raw;
    }

}