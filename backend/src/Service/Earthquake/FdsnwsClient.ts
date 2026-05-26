import {Logger} from 'figtree';
import {EarthquakeBbox} from '../../Db/MariaDb/Repositories/EarthquakeRepository.js';

/**
 * Normalised earthquake event after mapping a provider's GeoJSON
 * feature. `source` is the provider tag stored verbatim in the DB
 * (`usgs`, `emsc`) — events from different providers describing the
 * same physical earthquake are kept as separate rows (we don't have a
 * stable physical-event id across catalogs), which inflates correlation
 * counts a bit but keeps provenance clean.
 */
export type FdsnwsEvent = {
    source: string;
    source_event_id: string;
    event_time_ms: number;
    lat: number;
    lon: number;
    depth_km: number | null;
    magnitude: number;
    magnitude_type: string;
    place: string;
    url: string;
};

/**
 * Base class for any FDSNWS-compatible earthquake catalog client.
 * Both USGS (`earthquake.usgs.gov/fdsnws/event/1/query`) and EMSC
 * (`seismicportal.eu/fdsnws/event/1/query`) implement the same
 * parameter spec; only the endpoint and a few `properties.*` field
 * names differ. The `_mapFeature` mapper tolerates both spellings so
 * subclasses only have to point at the right URL.
 */
export abstract class FdsnwsClient {

    /**
     * Hard ceiling on results per request. FDSNWS endpoints usually
     * allow up to 20 000 but larger pages are slow; anything past the
     * cap is picked up by the next cron tick (events are time-ordered).
     */
    protected static readonly MAX_LIMIT = 1000;

    public abstract getEndpoint(): string;

    public abstract getSource(): string;

    /**
     * FDSNWS-event `format` parameter. USGS accepts `geojson` only;
     * EMSC accepts `json` (its GeoJSON variant) but not `geojson`.
     * Subclasses override as needed; both formats parse with the same
     * `_mapFeature` mapper because the body shape is identical.
     */
    protected _getFormat(): string {
        return 'geojson';
    }

    /**
     * Provider-specific deep-link builder used when the GeoJSON
     * `properties.url` field is absent. USGS always sets it so the
     * default returns ''; EMSC subclass overrides this.
     */
    protected _buildEventUrl(_featureId: string): string {
        return '';
    }

    public async fetchEvents(
        bbox: EarthquakeBbox,
        startTimeMs: number,
        endTimeMs: number,
        minMagnitude: number,
        limit: number = FdsnwsClient.MAX_LIMIT
    ): Promise<FdsnwsEvent[]> {
        const params = new URLSearchParams({
            format: this._getFormat(),
            starttime: new Date(startTimeMs).toISOString(),
            endtime: new Date(endTimeMs).toISOString(),
            minlatitude: `${bbox.min_lat}`,
            maxlatitude: `${bbox.max_lat}`,
            minlongitude: `${bbox.min_lon}`,
            maxlongitude: `${bbox.max_lon}`,
            minmagnitude: `${minMagnitude}`,
            orderby: 'time-asc',
            limit: `${Math.min(limit, FdsnwsClient.MAX_LIMIT)}`
        });

        const url = `${this.getEndpoint()}?${params.toString()}`;
        const source = this.getSource();

        const res = await fetch(url, {headers: {Accept: 'application/geojson'}});
        if (!res.ok) {
            Logger.getLogger().error(`FdsnwsClient(${source}): HTTP ${res.status} ${res.statusText} for ${url}`);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await res.json() as {features?: any[];};
        if (!body || !Array.isArray(body.features)) {
            return [];
        }

        const out: FdsnwsEvent[] = [];
        for (const f of body.features) {
            const mapped = this._mapFeature(f);
            if (mapped) {
                out.push(mapped);
            }
        }
        return out;
    }

    /**
     * Convert one GeoJSON feature into the normalised event shape.
     * Handles both naming conventions:
     *   - time:        USGS ms-epoch number, EMSC ISO string
     *   - magType:     USGS camelCase, EMSC `magtype`
     *   - place:       USGS `place`, EMSC `flynn_region`
     *   - url:         USGS sends it, EMSC needs us to build it
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _mapFeature(feature: any): FdsnwsEvent | null {
        if (!feature || typeof feature.id !== 'string' || !feature.properties || !feature.geometry) {
            return null;
        }
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
            return null;
        }
        const lon = Number(coords[0]);
        const lat = Number(coords[1]);
        // EMSC encodes depth as a negative Z (below-surface), USGS as positive.
        // Both expose `properties.depth` as a positive km value when present, so
        // prefer that and fall back to |Z| for providers that omit it.
        const depth = typeof feature.properties.depth === 'number'
            ? Number(feature.properties.depth)
            : coords.length >= 3 ? Math.abs(Number(coords[2])) : NaN;
        const mag = Number(feature.properties.mag);

        // Time can be ms-epoch (USGS) or an ISO string (EMSC).
        let timeMs = NaN;
        const tRaw = feature.properties.time;
        if (typeof tRaw === 'number') {
            timeMs = tRaw;
        } else if (typeof tRaw === 'string') {
            timeMs = Date.parse(tRaw);
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag) || !Number.isFinite(timeMs)) {
            return null;
        }

        const magType: string = typeof feature.properties.magType === 'string'
            ? feature.properties.magType
            : typeof feature.properties.magtype === 'string'
                ? feature.properties.magtype
                : '';

        const place: string = typeof feature.properties.place === 'string'
            ? feature.properties.place
            : typeof feature.properties.flynn_region === 'string'
                ? feature.properties.flynn_region
                : '';

        const url: string = typeof feature.properties.url === 'string' && feature.properties.url.length > 0
            ? feature.properties.url
            : this._buildEventUrl(feature.id);

        return {
            source: this.getSource(),
            source_event_id: feature.id,
            event_time_ms: timeMs,
            lat: lat,
            lon: lon,
            depth_km: Number.isFinite(depth) ? depth : null,
            magnitude: mag,
            magnitude_type: magType,
            place: place,
            url: url
        };
    }

}