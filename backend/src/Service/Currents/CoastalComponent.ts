import {SightingCurrentFieldGrid} from '../../Db/MariaDb/Entities/SightingCurrentField.js';
import {UtilIsInSea} from '../../Utils/UtilIsInSea.js';

/**
 * Signed cross-shore ("coastal") component of the regional current at a
 * sighting.
 *
 * The offshore unit normal of the nearest coast is derived purely from the
 * existing land/sea mask ({@link UtilIsInSea}, `@geo-maps/earth-seas-10m`) —
 * no extra data source. A ring of bearings at a fixed radius around the
 * sighting is probed; every land-side sample contributes a unit vector in the
 * (east, north) frame. Their mean points onshore, so its negation is the
 * offshore normal n̂. The centre-cell current vector (u, v) of the regional
 * CMEMS patch is then projected onto n̂:
 *
 *   coastal = u · n̂_east + v · n̂_north
 *
 * Positive = seaward (offshore) flow, negative = shoreward (onshore). NULL
 * when no coast lies within the radius (open ocean), the land samples cancel
 * to an ambiguous normal (e.g. a narrow symmetric bay), or the centre current
 * vector is missing.
 */
export class CoastalComponent {

    /**
     * Earth radius (metres, mean) — matches {@link CurrentRegionAggregates}.
     * @private
     */
    private static readonly EARTH_RADIUS_M = 6371008.8;

    /**
     * Distance from the sighting at which the coastline is probed (metres).
     * ~5 km keeps the normal local while staying coarse enough for the 10m
     * land/sea mask.
     * @private
     */
    private static readonly SEARCH_RADIUS_M = 5000;

    /**
     * Number of evenly spaced bearings sampled around the ring.
     * @private
     */
    private static readonly N_BEARINGS = 16;

    /**
     * Below this magnitude the summed land direction is treated as
     * ambiguous (no well-defined shore normal) and the result is null.
     * @private
     */
    private static readonly MIN_NORMAL = 1e-6;

    /**
     * Compute the signed coastal component (m/s), rounded to 2 decimals, or
     * null when it cannot be defined for this sighting.
     *
     * @param {number} latDeg - sighting latitude in degrees
     * @param {number} lonDeg - sighting longitude in degrees
     * @param {SightingCurrentFieldGrid} grid - the regional u/v patch
     * @return {number | null}
     */
    public static compute(latDeg: number, lonDeg: number, grid: SightingCurrentFieldGrid): number | null {
        const current = CoastalComponent._centreCurrent(grid);

        if (current === null) {
            return null;
        }

        const normal = CoastalComponent.offshoreNormal(latDeg, lonDeg);

        if (normal === null) {
            return null;
        }

        const coastal = (current.u * normal.east) + (current.v * normal.north);

        return Math.round(coastal * 100) / 100;
    }

    /**
     * Centre-cell eastward/northward current (m/s) of the patch, or null if
     * that cell is missing / non-finite.
     * @private
     */
    private static _centreCurrent(grid: SightingCurrentFieldGrid): {u: number; v: number;} | null {
        const nLat = grid.grid_lat.length;
        const nLon = grid.grid_lon.length;

        if (nLat === 0 || nLon === 0) {
            return null;
        }

        const ci = Math.floor(nLat / 2);
        const cj = Math.floor(nLon / 2);
        const u = grid.u[ci]?.[cj];
        const v = grid.v[ci]?.[cj];

        if (typeof u !== 'number' || typeof v !== 'number' || !Number.isFinite(u) || !Number.isFinite(v)) {
            return null;
        }

        return {u: u, v: v};
    }

    /**
     * Offshore unit normal (east, north) of the nearest coast, derived by
     * ring-sampling the land/sea mask. Null when no land is found within the
     * radius, or the land samples cancel to an ambiguous direction.
     *
     * Public so other derived metrics (e.g. the Ekman upwelling index) can
     * reuse the same coast-geometry probe instead of duplicating it.
     */
    public static offshoreNormal(latDeg: number, lonDeg: number): {east: number; north: number;} | null {
        const latRad = latDeg * Math.PI / 180;
        const cosLat = Math.cos(latRad);

        // Angular offsets for the search radius (small-angle, equirectangular).
        const dLatDeg = (CoastalComponent.SEARCH_RADIUS_M / CoastalComponent.EARTH_RADIUS_M) * (180 / Math.PI);
        const dLonDeg = Math.abs(cosLat) < 1e-9 ? dLatDeg : dLatDeg / cosLat;

        let landEast = 0;
        let landNorth = 0;
        let landCount = 0;

        for (let k = 0; k < CoastalComponent.N_BEARINGS; k++) {
            const bearing = (2 * Math.PI * k) / CoastalComponent.N_BEARINGS;
            const east = Math.sin(bearing);
            const north = Math.cos(bearing);
            const sampleLat = latDeg + (north * dLatDeg);
            const sampleLon = lonDeg + (east * dLonDeg);

            if (!UtilIsInSea.isInSea(sampleLon, sampleLat)) {
                landEast += east;
                landNorth += north;
                landCount++;
            }
        }

        if (landCount === 0) {
            return null;
        }

        // Mean land direction points onshore; the offshore normal is its negation.
        const magnitude = Math.sqrt((landEast * landEast) + (landNorth * landNorth));

        if (magnitude < CoastalComponent.MIN_NORMAL) {
            return null;
        }

        return {
            east: -landEast / magnitude,
            north: -landNorth / magnitude
        };
    }

}