import moment from 'moment-timezone';
import {Logger} from 'figtree';
import {SettingsRepository} from '../../Db/MariaDb/Repositories/SettingsRepository.js';

/**
 * Persisted shape of the movement service's tunables. Stored under
 * `settings.name = 'sighting_movement.config'` as a JSON blob.
 *
 * Fields are intentionally simple primitives so the row is editable by
 * hand if the admin UI hasn't shipped yet. Missing or unparseable keys
 * fall back to {@link DEFAULT_MOVEMENT_CONFIG}.
 */
export type MovementConfig = {

    /**
     * Minutes added before `duration_from` when assembling the tracking
     * window — gives the rendered track a bit of context leading up to
     * the sighting (boat approach) instead of starting hard at the
     * recorded sighting time.
     */
    default_lead_minutes: number;

    /**
     * Minutes added after `duration_until` — same idea, captures the
     * boat's departure track after the sighting ended.
     */
    default_trail_minutes: number;

    /**
     * When true, the lead/trail buffer is added around the recorded
     * `duration_from`/`duration_until`. When false, the recorded
     * duration is used strictly with no extra buffer (useful if the
     * recorded values are very precise and any extension would muddy
     * the picture).
     *
     * Sightings without a valid recorded duration are *not* given a
     * synthetic window — they fall through to `source =
     * 'manual_begin_end'` instead. `create_datetime` is deliberately
     * not used as anchor: it's the mobile-sync time, often hours after
     * the actual sighting.
     */
    prefer_sighting_duration: boolean;

    /**
     * GPS-jump detector. Segment speeds above this value are marked
     * `quality = 'bad'` (segment stays in the table so the front-end
     * can grey it out, but it's excluded from aggregates).
     */
    outlier_speed_kmh: number;

    /**
     * IANA timezone used to interpret legacy `duration_from` /
     * `duration_until` HH:MM strings on sightings that lack a
     * `location_*.timestamp` (CSV imports / pre-2026 mobile rows).
     * The mobile GPS-fix path is unaffected — it works in UTC ms.
     *
     * MWPA operates out of the Canary Islands, so the recorded HH:MM
     * is local wall-clock time; parsing it in this zone produces the
     * correct UTC instant in both standard time and DST. The fallback
     * pre-2026-05-11 was the Node process TZ (UTC in Docker), which
     * silently shifted the window by 1h in DST months and landed
     * tracks in the wrong stretch of the tour.
     */
    default_local_tz: string;

};

/**
 * Defaults applied when the settings row is missing or malformed. Picked
 * for the typical MWPA workflow:
 *  - sightings usually last a few minutes ➜ a 5-min buffer on either side
 *    of the recording time catches the boat's approach + departure track
 *  - prefer the recorded duration when present (it's the ground truth)
 *  - 50 km/h is well above the realistic top speed of an observation
 *    boat in this area ➜ anything above is a GPS glitch
 */
export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
    default_lead_minutes: 5,
    default_trail_minutes: 5,
    prefer_sighting_duration: true,
    outlier_speed_kmh: 50,
    default_local_tz: 'Atlantic/Canary'
};

const SETTINGS_KEY = 'sighting_movement.config';

/**
 * Settings-backed reader/writer for {@link MovementConfig}. Loaded
 * lazily; call {@link reload} after an admin edit to invalidate the cache.
 *
 * The service holds one instance and re-reads it lazily — this class
 * is **not** safe to share across multiple service instances that might
 * write concurrently.
 */
export class SightingMovementConfig {

    private _cached: MovementConfig | null = null;

    /**
     * Return the current config. First call loads from DB; subsequent
     * calls return the cache until {@link reload} is invoked.
     */
    public async get(): Promise<MovementConfig> {
        if (this._cached !== null) {
            return this._cached;
        }

        this._cached = await this._loadFromDb();
        return this._cached;
    }

    /**
     * Discard the cache. Next {@link get} call hits the DB again. Call
     * this after a settings change persisted by another path (admin UI,
     * manual SQL).
     */
    public reload(): void {
        this._cached = null;
    }

    /**
     * Overwrite the persisted config and refresh the cache. Caller-side
     * validation: every field must be a positive finite number except
     * the boolean. Invalid input throws.
     */
    public async save(config: MovementConfig): Promise<void> {
        SightingMovementConfig._validate(config);

        await SettingsRepository.getInstance().setByName(
            SETTINGS_KEY,
            JSON.stringify(config)
        );
        this._cached = config;
    }

    /**
     * Read + parse the settings row. Falls back to the defaults on any
     * problem (missing row, unparseable JSON, missing keys) — but logs
     * each fallback so a misconfigured row doesn't go silent.
     */
    private async _loadFromDb(): Promise<MovementConfig> {
        const row = await SettingsRepository.getInstance().findByName(SETTINGS_KEY);

        if (row === null || row.data === '') {
            return {...DEFAULT_MOVEMENT_CONFIG};
        }

        try {
            const parsed = JSON.parse(row.data) as Partial<MovementConfig>;
            return {
                default_lead_minutes: SightingMovementConfig._asPositiveNumber(
                    parsed.default_lead_minutes,
                    DEFAULT_MOVEMENT_CONFIG.default_lead_minutes
                ),
                default_trail_minutes: SightingMovementConfig._asPositiveNumber(
                    parsed.default_trail_minutes,
                    DEFAULT_MOVEMENT_CONFIG.default_trail_minutes
                ),
                prefer_sighting_duration: typeof parsed.prefer_sighting_duration === 'boolean'
                    ? parsed.prefer_sighting_duration
                    : DEFAULT_MOVEMENT_CONFIG.prefer_sighting_duration,
                outlier_speed_kmh: SightingMovementConfig._asPositiveNumber(
                    parsed.outlier_speed_kmh,
                    DEFAULT_MOVEMENT_CONFIG.outlier_speed_kmh
                ),
                default_local_tz: SightingMovementConfig._asTimezone(
                    parsed.default_local_tz,
                    DEFAULT_MOVEMENT_CONFIG.default_local_tz
                )
            };
        } catch (e) {
            Logger.getLogger().error(
                `SightingMovementConfig: failed to parse settings row "${SETTINGS_KEY}", using defaults`,
                e as Error
            );
            return {...DEFAULT_MOVEMENT_CONFIG};
        }
    }

    private static _asPositiveNumber(value: unknown, fallback: number): number {
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    }

    /**
     * Accept a string that moment-timezone recognises as an IANA zone
     * (e.g. `Atlantic/Canary`, `UTC`, `Europe/Berlin`). Anything else
     * — including empty strings, non-strings, or typos like
     * `Atlantic/Canaries` — falls back so a malformed settings row
     * can't break the entire movement rebuild.
     */
    private static _asTimezone(value: unknown, fallback: string): string {
        if (typeof value !== 'string' || value.trim() === '') {
            return fallback;
        }
        const trimmed = value.trim();
        return moment.tz.zone(trimmed) !== null ? trimmed : fallback;
    }

    private static _validate(config: MovementConfig): void {
        if (!Number.isFinite(config.default_lead_minutes) || config.default_lead_minutes < 0) {
            throw new Error('default_lead_minutes must be a non-negative finite number');
        }
        if (!Number.isFinite(config.default_trail_minutes) || config.default_trail_minutes < 0) {
            throw new Error('default_trail_minutes must be a non-negative finite number');
        }
        if (!Number.isFinite(config.outlier_speed_kmh) || config.outlier_speed_kmh <= 0) {
            throw new Error('outlier_speed_kmh must be a positive finite number');
        }
        if (typeof config.default_local_tz !== 'string' || moment.tz.zone(config.default_local_tz) === null) {
            throw new Error(`default_local_tz must be a valid IANA timezone, got "${String(config.default_local_tz)}"`);
        }
    }

}