import {Logger} from 'figtree';
import {OrganizationRepository} from '../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {OrganizationTrackingAreaRepository} from '../../Db/MariaDb/Repositories/OrganizationTrackingAreaRepository.js';
import {EarthquakeBbox} from '../../Db/MariaDb/Repositories/EarthquakeRepository.js';

/**
 * Compute the import bbox for the EarthquakeService. The naive approach
 * — outer-ring envelope of each tracking-area polygon — fails when an
 * org's home polygon is just a small harbor or marina (e.g. a 2 km
 * square in La Gomera). In that case neighbouring-island earthquakes
 * 100+ km away would never make it into the local table and could
 * never correlate with sightings that the harbor's tour boat actually
 * reached.
 *
 * Instead we treat each org as a *centroid + radius*: take the polygon
 * centroid (mean of its outer ring), or fall back to
 * `Organization.lat/lon` when no polygon exists, and expand by a
 * configurable km radius. The union of all org-bboxes is one bbox sent
 * to USGS — wide enough to feed the per-sighting correlation
 * (which has its own, much tighter, radius).
 */
export class EarthquakeBboxResolver {

    /**
     * 1° latitude ≈ 111 km. Longitude scaling depends on latitude
     * (cos), computed per-centroid below.
     */
    private static readonly KM_PER_DEG_LAT = 111;

    public static async resolveUnionBbox(radiusKm: number): Promise<EarthquakeBbox | null> {
        const centroids: Array<{lat: number; lon: number;}> = [];

        // First pass: tracking-area polygons → centroid of outer ring.
        const areas = await OrganizationTrackingAreaRepository.getInstance().findAll();
        const orgsWithArea = new Set<number>();
        for (const area of areas) {
            const ring = EarthquakeBboxResolver._extractFirstPolygonRing(area.geojsonstr);
            if (!ring || ring.length === 0) {
                continue;
            }
            const c = EarthquakeBboxResolver._centroid(ring);
            if (c) {
                centroids.push(c);
                orgsWithArea.add(area.organization_id);
            }
        }

        // Second pass: orgs that don't have a usable tracking area fall
        // back to their HQ lat/lon (Organization.lat/lon — stored as
        // strings).
        const orgs = await OrganizationRepository.getInstance().findAll();
        for (const org of orgs) {
            if (orgsWithArea.has(org.id)) {
                continue;
            }
            const lat = parseFloat(org.lat);
            const lon = parseFloat(org.lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                centroids.push({lat: lat, lon: lon});
            }
        }

        if (centroids.length === 0) {
            Logger.getLogger().warn('EarthquakeBboxResolver: no org with tracking area or HQ lat/lon — skipping');
            return null;
        }

        let minLat = Number.POSITIVE_INFINITY;
        let maxLat = Number.NEGATIVE_INFINITY;
        let minLon = Number.POSITIVE_INFINITY;
        let maxLon = Number.NEGATIVE_INFINITY;

        for (const c of centroids) {
            const dLat = radiusKm / EarthquakeBboxResolver.KM_PER_DEG_LAT;
            // Longitude degrees per km shrinks with cos(latitude); clamp
            // to avoid blow-ups near the poles.
            const cosLat = Math.max(0.01, Math.cos((c.lat * Math.PI) / 180));
            const dLon = radiusKm / (EarthquakeBboxResolver.KM_PER_DEG_LAT * cosLat);

            if (c.lat - dLat < minLat) { minLat = c.lat - dLat; }
            if (c.lat + dLat > maxLat) { maxLat = c.lat + dLat; }
            if (c.lon - dLon < minLon) { minLon = c.lon - dLon; }
            if (c.lon + dLon > maxLon) { maxLon = c.lon + dLon; }
        }

        // Final clamping to legal lat/lon range so a wild input doesn't
        // hand USGS a malformed query.
        return {
            min_lat: Math.max(-90, minLat),
            max_lat: Math.min(90, maxLat),
            min_lon: Math.max(-180, minLon),
            max_lon: Math.min(180, maxLon)
        };
    }

    /**
     * Arithmetic mean of an outer-ring's vertices. Good enough for the
     * import-bbox use-case: we only need a "somewhere inside" point so
     * the radius expansion lands the bbox over the relevant ocean.
     */
    private static _centroid(ring: number[][]): {lat: number; lon: number;} | null {
        let sumLat = 0;
        let sumLon = 0;
        let n = 0;
        for (const pt of ring) {
            const lon = pt[0];
            const lat = pt[1];
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                sumLat += lat;
                sumLon += lon;
                n++;
            }
        }
        if (n === 0) {
            return null;
        }
        return {lat: sumLat / n, lon: sumLon / n};
    }

    /**
     * Pull the outer ring (array of [lon, lat] pairs) of the first
     * Polygon feature in a GeoJSON FeatureCollection string. Returns
     * null when the string can't be parsed or doesn't contain a polygon.
     */
    private static _extractFirstPolygonRing(geojsonstr: string): number[][] | null {
        if (!geojsonstr) {
            return null;
        }
        try {
            const data = JSON.parse(geojsonstr) as {
                type?: string;
                features?: {
                    type?: string;
                    geometry?: {
                        type?: string;
                        coordinates?: number[][][];
                    };
                }[];
            };
            if (!data || data.type !== 'FeatureCollection' || !data.features || data.features.length === 0) {
                return null;
            }
            for (const feat of data.features) {
                if (feat.geometry && feat.geometry.type === 'Polygon' && Array.isArray(feat.geometry.coordinates) && feat.geometry.coordinates.length > 0) {
                    return feat.geometry.coordinates[0];
                }
            }
            return null;
        } catch {
            return null;
        }
    }

}