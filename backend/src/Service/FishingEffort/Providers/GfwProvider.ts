import {Logger} from 'figtree';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {FishingEffortInfo, FishingEffortProvider, FishingEffortSample} from '../Types.js';

/**
 * Shape of one row in a GFW 4Wings report response. With
 * `group-by=VESSEL_ID` and `temporal-resolution=ENTIRE`, each row
 * represents one vessel's total hours in the queried polygon over
 * the date range. `flag` / `gearType` may be returned when the
 * server enriches per-vessel results. Field-name casing varies by
 * GFW endpoint — accept both snake-case and camelCase variants so
 * we don't silently lose values when the API tweaks naming.
 */
type GfwReportRow = {
    hours?: number;
    Hours?: number;
    apparentFishingHours?: number;
    apparent_fishing_hours?: number;
    fishingHours?: number;
    fishing_hours?: number;
    vesselId?: string;
    vessel_id?: string;
    flag?: string;
    gearType?: string;
    geartype?: string;
};

/**
 * GFW 4Wings report response. The `entries` array carries one entry
 * per requested dataset; each entry is an object keyed by the
 * server-resolved dataset id (e.g. `public-global-fishing-effort:v4.0`
 * — GFW resolves our `:latest` to a concrete version) with either
 * the row list or `null` when no data matched.
 */
type GfwReportEntry = Record<string, GfwReportRow[] | null>;

type GfwReportResponse = {
    total?: number;
    entries?: GfwReportEntry[];
};

/**
 * Global Fishing Watch provider for per-sighting commercial-fishing
 * pressure. Uses the public `4Wings stats` endpoint, queried with a
 * bbox around the sighting point on the sighting day.
 *
 * Authentication is via a per-user bearer token issued by GFW (free,
 * requires registration at https://globalfishingwatch.org/our-apis/).
 * The token is read from the environment variable `MWPA_GFW_TOKEN` at
 * construction time. When the variable is absent or empty the
 * provider self-disables (`supports()` returns false) and logs once
 * at startup — so the service marks rows as 'no_provider' and stops
 * retrying instead of erroring on every cron tick.
 *
 * TODO: when the GFW token lands in production, move it into the
 * proper config schema (BackendConfigOptions.gfw.token) via the
 * vtseditor MCP and read it from MWPAConfig instead of process.env.
 * The env-var path stays as a deployment-time override.
 *
 * Per sighting we issue TWO HTTP calls:
 *   1. 25 km bbox stats with grouping by flag + gear → fishing hours,
 *      vessel count, top gear, top flag.
 *   2. 50 km bbox stats (totals only) → wider-radius fishing hours.
 *
 * Both calls go through a shared RateLimiter (1.5 s = ~40 req/min)
 * which stays well under GFW's public quota.
 *
 * The exact request body shape mirrors the GFW 4Wings stats API as
 * documented at https://globalfishingwatch.org/our-apis/documentation
 * — verify on first smoke test once a token is provisioned; if a 4xx
 * comes back, adjust {@link GfwProvider._buildStatsBody}.
 */
export class GfwProvider implements FishingEffortProvider {

    /**
     * Stable provider id stored in FishingEffortInfo.provider and
     * provenance.
     */
    public static readonly NAME = 'gfw';

    /**
     * Environment variable that carries the GFW bearer token.
     */
    public static readonly TOKEN_ENV_VAR = 'MWPA_GFW_TOKEN';

    /**
     * GFW API base URL — the v3 gateway.
     * @private
     */
    private static readonly BASE_URL = 'https://gateway.api.globalfishingwatch.org/v3';

    /**
     * GFW public fishing-effort dataset id. Pinning to `:latest` so
     * the values always come from the freshest GFW release; downside
     * is that day-N reanalysis may differ slightly from day-1 NRT.
     * @private
     */
    private static readonly DATASET_ID = 'public-global-fishing-effort:latest';

    /**
     * Endpoint path under {@link BASE_URL}. The v3 GFW API exposes
     * spatially-aggregated fishing-effort stats via `/4wings/report`
     * (not `/4wings/stats`, which is the per-tile/timeseries route).
     * Custom polygons are POSTed as raw GeoJSON in the body; all
     * other parameters go into the URL query string. Pattern verified
     * against the official `gfwr` R client and `gfw-mcp-js`.
     * @private
     */
    private static readonly REPORT_PATH = '/4wings/report';

    /**
     * AIS coverage in the GFW dataset is patchy before 2012-01.
     * Older sightings get NULL.
     * @private
     */
    public static readonly EARLIEST_ISO_DATE = '2012-01-01';

    /**
     * Inner radius (km) — fishing-hours, vessel-count, and gear/flag
     * breakdown are computed here.
     */
    private static readonly INNER_RADIUS_KM = 25;

    /**
     * Outer radius (km) — wider fishing-hours total.
     */
    private static readonly OUTER_RADIUS_KM = 50;

    /**
     * Approx km per degree of latitude on a spherical Earth — good
     * enough for bbox conversions at this scale.
     * @private
     */
    private static readonly KM_PER_DEG_LAT = 111.32;

    /**
     * 1.5 s min interval between calls → ~40 req/min, comfortably
     * under GFW's public quota.
     * @private
     */
    private readonly _limiter = new RateLimiter(1500);

    /**
     * Max retry attempts on HTTP 429. GFW free-tier tokens allow only
     * one *concurrent* report, and a slow upstream response can make
     * the next call land before the previous one has been released —
     * so 429 is benign and worth retrying.
     * @private
     */
    private static readonly MAX_RETRIES_429 = 3;

    /**
     * Fallback backoff (ms) when GFW does not send a `Retry-After`
     * header. Doubles per attempt: 5 s, 10 s, 20 s. Capped at 60 s.
     * @private
     */
    private static readonly BASE_BACKOFF_MS = 5000;

    /**
     * Hard ceiling for any computed retry-after delay (ms), whether
     * it came from the header or from the fallback. Protects against
     * pathological server responses like `Retry-After: 3600`.
     * @private
     */
    private static readonly MAX_BACKOFF_MS = 60000;

    /**
     * Bearer token, or empty when disabled.
     * @private
     */
    private readonly _token: string;

    /**
     * One-shot debug latch: log the first successful response body so
     * the operator can verify the assumed shape (`entries[]` + `hours`
     * / `Hours` field). Cleared once the first OK comes in so the
     * log stays quiet in steady state.
     * @private
     */
    private _firstOkLogged: boolean = false;

    public constructor(token?: string) {
        this._token = (token ?? process.env[GfwProvider.TOKEN_ENV_VAR] ?? '').trim();

        if (this._token === '') {
            Logger.getLogger().info(
                `GfwProvider: disabled — no ${GfwProvider.TOKEN_ENV_VAR} env var set (rows will be marked 'no_provider')`
            );
        }
    }

    public getName(): string {
        return GfwProvider.NAME;
    }

    public supports(): boolean {
        return this._token !== '';
    }

    public async getFishingEffort(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<FishingEffortInfo | null> {
        if (this._token === '') {
            return null;
        }

        if (isoDate < GfwProvider.EARLIEST_ISO_DATE) {
            return null;
        }

        const inner = await this._fetchReport(
            latitude,
            longitude,
            isoDate,
            GfwProvider.INNER_RADIUS_KM,
            'VESSEL_ID'
        );

        if (inner === null) {
            return null;
        }

        const outer = await this._fetchReport(
            latitude,
            longitude,
            isoDate,
            GfwProvider.OUTER_RADIUS_KM,
            'VESSEL_ID'
        );

        const innerRows = GfwProvider._extractRows(inner);
        const outerRows = outer === null ? [] : GfwProvider._extractRows(outer);

        const innerHours = GfwProvider._sumHours(innerRows);
        const outerHours = outer === null ? innerHours : GfwProvider._sumHours(outerRows);
        // group-by=VESSEL_ID returns one row per vessel — distinct
        // vessel count is the row count after the hours sum (a vessel
        // with 0 hours wouldn't be returned anyway).
        const vesselCount = innerRows.length;
        const topGear = GfwProvider._topByHours(innerRows, 'geartype');
        const topFlag = GfwProvider._topByHours(innerRows, 'flag');

        const sample: FishingEffortSample = {
            fishing_hours_day_25km: GfwProvider._round(innerHours, 2),
            fishing_hours_day_50km: GfwProvider._round(outerHours, 2),
            vessel_count_day_25km: vesselCount
        };

        if (topGear !== null) {
            sample.top_gear_type = topGear;
        }

        if (topFlag !== null) {
            sample.top_flag = topFlag;
        }

        return {
            day: sample,
            provider: GfwProvider.NAME,
            dataset_version: GfwProvider.DATASET_ID,
            fetched_at: Date.now()
        };
    }

    /**
     * Issue one GFW 4Wings report call. The polygon goes in the POST
     * body as raw GeoJSON; everything else (datasets, date range,
     * group-by, format) goes in the query string. Returns the parsed
     * response or null on HTTP / parse error (so the caller can
     * degrade to a partial result rather than failing the whole
     * sighting).
     * @private
     */
    private async _fetchReport(
        latitude: number,
        longitude: number,
        isoDate: string,
        radiusKm: number,
        groupBy: string
    ): Promise<GfwReportResponse | null> {
        const url = GfwProvider._buildReportUrl(isoDate, groupBy);
        const body = GfwProvider._buildPolygonBody(latitude, longitude, radiusKm);
        const logger = Logger.getLogger();

        let response: {status: number; body: string; retryAfter: number | null;} | null = null;
        let attempt = 0;

        while (attempt <= GfwProvider.MAX_RETRIES_429) {
            // Sequential retry — Promise.all isn't applicable here, the
            // whole point is to wait, observe the response, and decide.
            // eslint-disable-next-line no-await-in-loop
            response = await this._limiter.schedule(async() => {
                const controller = new AbortController();
                const timer = setTimeout((): void => controller.abort(), 15000);

                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'accept': 'application/json',
                            'authorization': `Bearer ${this._token}`,
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });

                    const text = await res.text();
                    return {
                        status: res.status,
                        body: text,
                        retryAfter: GfwProvider._parseRetryAfter(res.headers.get('retry-after'))
                    };
                } finally {
                    clearTimeout(timer);
                }
            });

            if (response.status !== 429) {
                break;
            }

            attempt++;
            if (attempt > GfwProvider.MAX_RETRIES_429) {
                logger.warn(
                    `GfwProvider: HTTP 429 persisted after ${GfwProvider.MAX_RETRIES_429} retries — giving up for this sighting`
                );
                return null;
            }

            const headerDelay = response.retryAfter;
            const fallback = GfwProvider.BASE_BACKOFF_MS * (2 ** (attempt - 1));
            const waitMs = Math.min(
                headerDelay === null ? fallback : headerDelay * 1000,
                GfwProvider.MAX_BACKOFF_MS
            );

            const source = headerDelay === null ? 'backoff' : 'header';
            logger.warn(
                `GfwProvider: HTTP 429 — retry ${attempt}/${GfwProvider.MAX_RETRIES_429} in ${Math.round(waitMs / 1000)}s (source: ${source})`
            );
            // eslint-disable-next-line no-await-in-loop
            await GfwProvider._sleep(waitMs);
        }

        if (response === null) {
            return null;
        }

        if (response.status === 401 || response.status === 403) {
            logger.warn(
                `GfwProvider: ${response.status} from GFW — token rejected or insufficient scope`
            );
            return null;
        }

        // 404 here typically means "no fishing activity at this
        // polygon + date" rather than a missing endpoint — the
        // /4wings/report path itself is stable. Degrade silently
        // (caller treats null as "no data").
        if (response.status === 404) {
            return null;
        }

        if (response.status !== 200) {
            // Truncate body to keep one log line manageable; long
            // upstream error messages otherwise dominate the log.
            const snippet = response.body.length > 400
                ? `${response.body.slice(0, 400)}…`
                : response.body;
            logger.warn(`GfwProvider: HTTP ${response.status} from ${url} — body: ${snippet}`);
            return null;
        }

        let parsed: GfwReportResponse;
        try {
            parsed = JSON.parse(response.body) as GfwReportResponse;
        } catch {
            return null;
        }

        // One-shot debug sample: log the first response that actually
        // carries non-null fishing data so we can verify per-row field
        // names. All-null responses (no fishing in polygon/date) are
        // common and uninformative — skip them.
        if (!this._firstOkLogged) {
            const rows = GfwProvider._extractRows(parsed);
            if (rows.length > 0) {
                this._firstOkLogged = true;
                const snippet = response.body.length > 800
                    ? `${response.body.slice(0, 800)}…`
                    : response.body;
                logger.info(`GfwProvider: first response with data — ${snippet}`);
            }
        }

        return parsed;
    }

    /**
     * Build the request URL for `/4wings/report` with all common
     * query parameters set. The polygon is sent separately as the
     * POST body (see {@link _buildPolygonBody}).
     * @private
     */
    private static _buildReportUrl(isoDate: string, groupBy: string): string {
        const params = new URLSearchParams();
        params.set('datasets[0]', GfwProvider.DATASET_ID);
        params.set('date-range', `${isoDate},${isoDate}`);
        params.set('format', 'JSON');
        params.set('spatial-aggregation', 'true');
        params.set('temporal-resolution', 'ENTIRE');
        params.set('group-by', groupBy);

        return `${GfwProvider.BASE_URL}${GfwProvider.REPORT_PATH}?${params.toString()}`;
    }

    /**
     * Build the request body for a `/4wings/report` POST with a
     * custom polygon. GFW wants:
     *   `{"geojson": <FeatureCollection>}`
     * — a wrapping envelope with a single `geojson` key whose value is
     * a standard GeoJSON FeatureCollection containing one Feature
     * with the polygon. Verified against the official `gfwr` R client
     * (`sf_to_geojson(endpoint = "raster")`). A bare Feature or a
     * `{region: ...}` envelope both fail with HTTP 422.
     * @private
     */
    private static _buildPolygonBody(
        latitude: number,
        longitude: number,
        radiusKm: number
    ): Record<string, unknown> {
        const polygon = GfwProvider._bboxPolygon(latitude, longitude, radiusKm);

        return {
            geojson: {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [polygon]
                    }
                }]
            }
        };
    }

    /**
     * Pull the row list out of a GfwReportResponse. The response
     * carries one {@link GfwReportEntry} per requested dataset; each
     * entry is an object keyed by the dataset's server-resolved
     * version (we don't know the version up front because GFW
     * resolves `:latest` for us, so we take the first non-null value
     * regardless of key). A null inner value means "no data for this
     * polygon+date" and yields an empty row list.
     * @private
     */
    private static _extractRows(response: GfwReportResponse): GfwReportRow[] {
        const entries = response.entries;

        if (!Array.isArray(entries) || entries.length === 0) {
            return [];
        }

        const collected: GfwReportRow[] = [];

        for (const entry of entries) {
            if (entry === null || typeof entry !== 'object') {
                // eslint-disable-next-line no-continue
                continue;
            }

            for (const value of Object.values(entry)) {
                if (Array.isArray(value)) {
                    collected.push(...value);
                }
            }
        }

        return collected;
    }

    /**
     * Return a 5-vertex closed polygon ring approximating a `radiusKm`
     * bbox centred on (latitude, longitude). GeoJSON-style
     * [lon, lat] coordinates, ring closed by repeating the first
     * vertex.
     * @private
     */
    private static _bboxPolygon(latitude: number, longitude: number, radiusKm: number): number[][] {
        const dLat = radiusKm / GfwProvider.KM_PER_DEG_LAT;
        const cosLat = Math.cos(latitude * Math.PI / 180);
        // Guard against the cos→0 singularity near the poles.
        const safeCos = Math.max(Math.abs(cosLat), 1e-6);
        const dLon = radiusKm / (GfwProvider.KM_PER_DEG_LAT * safeCos);

        const south = latitude - dLat;
        const north = latitude + dLat;
        const west = longitude - dLon;
        const east = longitude + dLon;

        return [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south]
        ];
    }

    /**
     * Sum the fishing-hours column across all rows. GFW uses
     * different field names across endpoints / versions — try the
     * common ones in order and take the first finite value per row.
     * @private
     */
    private static _sumHours(rows: GfwReportRow[]): number {
        let total = 0;

        for (const row of rows) {
            const value = GfwProvider._extractHours(row);
            if (value !== null) {
                total += value;
            }
        }

        return total;
    }

    /**
     * Extract the fishing-hours value from a row, trying common GFW
     * field-name variants. Returns null when none are populated.
     * @private
     */
    private static _extractHours(row: GfwReportRow): number | null {
        const candidates = [
            row.hours,
            row.Hours,
            row.apparentFishingHours,
            row.apparent_fishing_hours,
            row.fishingHours,
            row.fishing_hours
        ];

        for (const candidate of candidates) {
            if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                return candidate;
            }
        }

        return null;
    }

    /**
     * Find the value of `key` in the row with the highest `hours`.
     * Returns null when no row has a non-empty value for `key`. We
     * keep this opportunistic: with `group-by=VESSEL_ID` the per-row
     * `flag` / `geartype` may or may not be populated depending on
     * the GFW response enrichment — when absent, top stays null.
     * @private
     */
    private static _topByHours(rows: GfwReportRow[], key: 'geartype' | 'flag'): string | null {
        let topValue: string | null = null;
        let topHours = -1;

        for (const row of rows) {
            // Accept camelCase variant alongside snake-case so a casing
            // change in GFW's response doesn't quietly drop the field.
            const value = key === 'geartype' ? row.geartype ?? row.gearType : row.flag;

            if (typeof value !== 'string' || value === '') {
                // eslint-disable-next-line no-continue
                continue;
            }

            const hours = GfwProvider._extractHours(row) ?? 0;

            if (hours > topHours) {
                topHours = hours;
                topValue = value;
            }
        }

        return topValue;
    }

    /**
     * Round x to `digits` fractional places.
     * @private
     */
    private static _round(x: number, digits: number): number {
        const factor = 10 ** digits;
        return Math.round(x * factor) / factor;
    }

    /**
     * Parse an HTTP `Retry-After` header value into seconds.
     * Accepts both forms allowed by RFC 7231:
     *   - `delta-seconds` ("120" → 120)
     *   - `HTTP-date` ("Wed, 21 Oct 2015 07:28:00 GMT" → seconds-until-then)
     * Returns null when the value is missing, malformed, or in the
     * past (so the caller falls back to exponential backoff).
     * @private
     */
    private static _parseRetryAfter(value: string | null): number | null {
        if (value === null) {
            return null;
        }

        const trimmed = value.trim();
        if (trimmed === '') {
            return null;
        }

        const asNumber = Number(trimmed);
        if (Number.isFinite(asNumber)) {
            return asNumber > 0 ? asNumber : null;
        }

        const asDate = Date.parse(trimmed);
        if (Number.isFinite(asDate)) {
            const deltaMs = asDate - Date.now();
            return deltaMs > 0 ? deltaMs / 1000 : null;
        }

        return null;
    }

    /**
     * @private
     */
    private static async _sleep(ms: number): Promise<void> {
        return new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });
    }

}