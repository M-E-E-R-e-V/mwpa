import {Logger} from 'figtree';
import {OrganizationTrackingAreaRepository} from '../../Db/MariaDb/Repositories/OrganizationTrackingAreaRepository.js';
import {EarthquakeBbox} from '../../Db/MariaDb/Repositories/EarthquakeRepository.js';

/**
 * Compute the union bbox over every organization's home tracking area,
 * so a single USGS request covers all orgs in one shot. Polygons are
 * stored as GeoJSON FeatureCollection in `organization_tracking_area`;
 * we walk the outer ring of the first Polygon feature per row and
 * accumulate min/max lat/lon.
 *
 * Returns null when no org has a tracking area configured — the caller
 * decides whether to skip the cron tick or fall back to a default.
 */
export class EarthquakeBboxResolver {

    /**
     * Optional padding (degrees) applied to the union bbox so sightings
     * close to the area edge still pick up neighbouring earthquakes.
     * ~0.5° ≈ 55 km — a sensible default for sightings happening near
     * the operational boundary.
     */
    private static readonly PADDING_DEG = 0.5;

    public static async resolveUnionBbox(): Promise<EarthquakeBbox | null> {
        const all = await OrganizationTrackingAreaRepository.getInstance().findAll();

        let minLat = Number.POSITIVE_INFINITY;
        let maxLat = Number.NEGATIVE_INFINITY;
        let minLon = Number.POSITIVE_INFINITY;
        let maxLon = Number.NEGATIVE_INFINITY;
        let any = false;

        for (const area of all) {
            const ring = EarthquakeBboxResolver._extractFirstPolygonRing(area.geojsonstr);
            if (!ring) {
                continue;
            }
            for (const pt of ring) {
                const lon = pt[0];
                const lat = pt[1];
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                    continue;
                }
                if (lat < minLat) { minLat = lat; }
                if (lat > maxLat) { maxLat = lat; }
                if (lon < minLon) { minLon = lon; }
                if (lon > maxLon) { maxLon = lon; }
                any = true;
            }
        }

        if (!any) {
            Logger.getLogger().warn('EarthquakeBboxResolver: no organization_tracking_area rows with parseable polygon — skipping');
            return null;
        }

        return {
            min_lat: minLat - EarthquakeBboxResolver.PADDING_DEG,
            max_lat: maxLat + EarthquakeBboxResolver.PADDING_DEG,
            min_lon: minLon - EarthquakeBboxResolver.PADDING_DEG,
            max_lon: maxLon + EarthquakeBboxResolver.PADDING_DEG
        };
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
