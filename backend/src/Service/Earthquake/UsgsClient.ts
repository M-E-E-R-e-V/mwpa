import {Logger} from 'figtree';
import {EarthquakeBbox} from '../../Db/MariaDb/Repositories/EarthquakeRepository.js';

/**
 * Shape of one feature in the USGS FDSNWS GeoJSON response. Trimmed to
 * the fields we actually use; USGS sends ~30 properties per event but
 * the rest are scale/origin metadata we don't need yet.
 */
export type UsgsEvent = {
    source: 'usgs';
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
 * Thin wrapper over USGS Earthquake Catalog API
 * (`fdsnws/event/1/query` — free, no key required).
 *
 * The endpoint streams GeoJSON FeatureCollections. We trim to a stable
 * subset of fields so a provider change later only needs a new
 * client / mapper class.
 */
export class UsgsClient {

    public static readonly ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

    /**
     * Hard ceiling on results per request. USGS allows up to 20 000 but
     * larger pages are slow and brittle — anything past the cap is
     * pulled in by the next cron tick (events are time-ordered).
     */
    private static readonly MAX_LIMIT = 1000;

    public async fetchEvents(
        bbox: EarthquakeBbox,
        startTimeMs: number,
        endTimeMs: number,
        minMagnitude: number,
        limit: number = UsgsClient.MAX_LIMIT
    ): Promise<UsgsEvent[]> {
        const params = new URLSearchParams({
            format: 'geojson',
            starttime: new Date(startTimeMs).toISOString(),
            endtime: new Date(endTimeMs).toISOString(),
            minlatitude: `${bbox.min_lat}`,
            maxlatitude: `${bbox.max_lat}`,
            minlongitude: `${bbox.min_lon}`,
            maxlongitude: `${bbox.max_lon}`,
            minmagnitude: `${minMagnitude}`,
            orderby: 'time-asc',
            limit: `${Math.min(limit, UsgsClient.MAX_LIMIT)}`
        });

        const url = `${UsgsClient.ENDPOINT}?${params.toString()}`;

        const res = await fetch(url, {
            headers: {Accept: 'application/geojson'}
        });
        if (!res.ok) {
            Logger.getLogger().error(`UsgsClient: HTTP ${res.status} ${res.statusText} for ${url}`);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await res.json() as {features?: any[];};
        if (!body || !Array.isArray(body.features)) {
            return [];
        }

        const out: UsgsEvent[] = [];
        for (const f of body.features) {
            const mapped = UsgsClient._mapFeature(f);
            if (mapped) {
                out.push(mapped);
            }
        }
        return out;
    }

    /**
     * Convert one GeoJSON feature into our normalised event. Returns
     * null on malformed rows (missing id / geometry).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static _mapFeature(feature: any): UsgsEvent | null {
        if (!feature || typeof feature.id !== 'string' || !feature.properties || !feature.geometry) {
            return null;
        }
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
            return null;
        }
        const lon = Number(coords[0]);
        const lat = Number(coords[1]);
        const depth = coords.length >= 3 ? Number(coords[2]) : NaN;
        const mag = Number(feature.properties.mag);
        const timeMs = Number(feature.properties.time);

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag) || !Number.isFinite(timeMs)) {
            return null;
        }

        return {
            source: 'usgs',
            source_event_id: feature.id,
            event_time_ms: timeMs,
            lat: lat,
            lon: lon,
            depth_km: Number.isFinite(depth) ? depth : null,
            magnitude: mag,
            magnitude_type: typeof feature.properties.magType === 'string' ? feature.properties.magType : '',
            place: typeof feature.properties.place === 'string' ? feature.properties.place : '',
            url: typeof feature.properties.url === 'string' ? feature.properties.url : ''
        };
    }

}