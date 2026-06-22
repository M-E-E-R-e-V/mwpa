import {Logger} from 'figtree';
import {SightingCurrentFieldGrid} from '../../Db/MariaDb/Entities/SightingCurrentField.js';
import {httpGetWithRetry} from '../Common/HttpGet.js';
import {RateLimiter} from '../Common/RateLimiter.js';

/**
 * Identifier of one CMEMS WMTS dataset layer carrying a daily-mean
 * `sea_water_velocity` (u + v) at the surface.
 */
export type CmemsCurrentsDataset = {

    /**
     * Stable provider id stored alongside the regional patch (column
     * `source`). Differentiates analysis-forecast vs multi-year history.
     */
    sourceId: string;

    /**
     * Earliest ISO date (`YYYY-MM-DD`) the dataset covers — older
     * sightings should fall back to another dataset (or no patch).
     */
    earliestIsoDate: string;

    /**
     * WMTS `layer` parameter value. Format defined by the upstream
     * `GetCapabilities`:
     * `{PRODUCT}/{datasetId}/{variable}`.
     */
    wmtsLayer: string;
};

/**
 * Outcome of a single GetFeatureInfo call: surface current u/v in m/s.
 * Either component may be null when the upstream had no value at the
 * queried pixel (land, missing data).
 */
export type CmemsPointSample = {
    u: number | null;
    v: number | null;
};

/**
 * Outcome of a regional patch fetch — grid coordinates and the matching
 * u/v field. `valid_at` is the upstream time stamp (00:00 UTC of the
 * requested ISO date).
 */
export type CmemsRegionalPatch = {
    grid: SightingCurrentFieldGrid;
    validAt: Date;
    source: string;
};

/**
 * Minimal CMEMS WMTS client geared at point + regional u/v extraction.
 *
 * The Copernicus Marine WMTS at `wmts.marine.copernicus.eu/teroWmts`
 * is public (no auth as of 2026-06, verified via curl GetCapabilities /
 * GetFeatureInfo). Each `GetFeatureInfo` call returns one pixel as
 * GeoJSON with `component1Value` (uo, m/s) + `component2Value` (vo,
 * m/s), so a regional patch is just N×M of those calls.
 *
 * Datasets:
 *   - {@link DATASET_ANFC} — Global Analysis-Forecast 1/12°, daily
 *     mean, covers ~2022-06 → +10 days from today.
 *   - {@link DATASET_MULTIYEAR} — Reanalysis 1/12°, daily mean, covers
 *     1993-01 → present minus the reprocessing lag.
 *
 * The patch fetch is heavy by design: a 9×9 grid is 81 GETs, a 13×13
 * grid is 169. The {@link RateLimiter} keeps us at 1 req/s so the
 * upstream stays happy; callers must therefore plan ~80–170 s of wall
 * time per sighting and run this off a background cron, not from a
 * request handler.
 */
export class CmemsWmtsClient {

    /**
     * Base URL of the public WMTS service.
     */
    public static readonly BASE_URL = 'https://wmts.marine.copernicus.eu/teroWmts';

    /**
     * Global Analysis-Forecast — operational Mercator 1/12°, daily mean.
     */
    public static readonly DATASET_ANFC: CmemsCurrentsDataset = {
        sourceId: 'cmems_wmts_glo_anfc',
        earliestIsoDate: '2022-06-01',
        wmtsLayer: 'GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m_202406/sea_water_velocity'
    };

    /**
     * Reanalysis — multi-year Mercator 1/12°, daily mean. Layer name
     * may need a one-time bump when CMEMS releases a new processing
     * version; the upstream `GetCapabilities` is authoritative.
     */
    public static readonly DATASET_MULTIYEAR: CmemsCurrentsDataset = {
        sourceId: 'cmems_wmts_glo_my',
        earliestIsoDate: '1993-01-01',
        wmtsLayer: 'GLOBAL_MULTIYEAR_PHY_001_030/cmems_mod_glo_phy_my_0.083deg_P1D-m_202311/sea_water_velocity'
    };

    /**
     * Rate-limit. 1 s/req → 60 req/min. Patch fetches dominate the
     * budget so we err on the side of being a polite client.
     * @private
     */
    private readonly _limiter = new RateLimiter(1000);

    /**
     * Pick the dataset whose coverage best matches an ISO date.
     * Returns null when no dataset covers the date.
     */
    public selectDataset(isoDate: string): CmemsCurrentsDataset | null {
        if (isoDate >= CmemsWmtsClient.DATASET_ANFC.earliestIsoDate) {
            return CmemsWmtsClient.DATASET_ANFC;
        }

        if (isoDate >= CmemsWmtsClient.DATASET_MULTIYEAR.earliestIsoDate) {
            return CmemsWmtsClient.DATASET_MULTIYEAR;
        }

        return null;
    }

    /**
     * Fetch the surface current u/v at a single (lat, lon) on the given
     * ISO date. Returns null for non-2xx responses or when the response
     * shape doesn't match. Returns a sample with both components null
     * when the upstream pixel was no-data.
     */
    public async fetchPoint(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<CmemsPointSample | null> {
        const dataset = this.selectDataset(isoDate);

        if (dataset === null) {
            return null;
        }

        const url = this._buildFeatureInfoUrl(dataset, latitude, longitude, isoDate);
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        return CmemsWmtsClient._parsePointResponse(response.body);
    }

    /**
     * Fetch a regular `nLat × nLon` grid of u/v vectors around the
     * sighting position, with `stepDeg` between cells. The grid is
     * centred on `(latitude, longitude)` and may extend slightly past
     * the upstream coverage at the poles — out-of-coverage cells come
     * back as nulls without aborting the patch.
     *
     * Issues `nLat × nLon` upstream calls serially through the
     * rate-limiter. Returns null when no dataset covers the requested
     * date.
     */
    public async fetchRegion(
        latitude: number,
        longitude: number,
        isoDate: string,
        nLat: number,
        nLon: number,
        stepDeg: number
    ): Promise<CmemsRegionalPatch | null> {
        const dataset = this.selectDataset(isoDate);

        if (dataset === null) {
            return null;
        }

        const halfLat = ((nLat - 1) / 2) * stepDeg;
        const halfLon = ((nLon - 1) / 2) * stepDeg;
        const gridLat: number[] = [];
        const gridLon: number[] = [];

        for (let i = 0; i < nLat; i++) {
            gridLat.push(CmemsWmtsClient._round(latitude - halfLat + (i * stepDeg), 5));
        }

        for (let j = 0; j < nLon; j++) {
            gridLon.push(CmemsWmtsClient._round(longitude - halfLon + (j * stepDeg), 5));
        }

        const u: (number | null)[][] = [];
        const v: (number | null)[][] = [];
        let okCount = 0;

        for (let i = 0; i < nLat; i++) {
            u.push([]);
            v.push([]);

            for (let j = 0; j < nLon; j++) {
                // eslint-disable-next-line no-await-in-loop
                const sample = await this.fetchPoint(gridLat[i], gridLon[j], isoDate);

                if (sample === null) {
                    u[i].push(null);
                    v[i].push(null);
                } else {
                    u[i].push(sample.u);
                    v[i].push(sample.v);

                    if (sample.u !== null && sample.v !== null) {
                        okCount++;
                    }
                }
            }
        }

        if (okCount === 0) {
            return null;
        }

        return {
            grid: {
                grid_lat: gridLat,
                grid_lon: gridLon,
                u: u,
                v: v
            },
            validAt: new Date(`${isoDate}T00:00:00Z`),
            source: dataset.sourceId
        };
    }

    /**
     * Build a `GetFeatureInfo` URL targeting one Web-Mercator pixel
     * that contains the requested geographic point. We anchor the call
     * on tilematrix=0/row=0/col=0 (a single global tile) with i=j set
     * to the pixel inside that tile — the upstream WMTS implementation
     * accepts this and snaps to the nearest model cell, which is good
     * enough for our use case (CMEMS 1/12° pixels are ~8 km — we only
     * need to land in the right cell, not the right sub-pixel).
     *
     * Tile size at level 0 is 256×256 pixels covering [−180, 180] ×
     * [−85.05, 85.05] in Web Mercator. We linearly map the geographic
     * point to that pixel space.
     * @private
     */
    private _buildFeatureInfoUrl(
        dataset: CmemsCurrentsDataset,
        latitude: number,
        longitude: number,
        isoDate: string
    ): string {
        const {tileMatrix, tileRow, tileCol, i, j} = CmemsWmtsClient._lonLatToTilePixel(longitude, latitude);
        const time = `${isoDate}T00:00:00.000Z`;
        const params = new URLSearchParams({
            service: 'WMTS',
            request: 'GetFeatureInfo',
            version: '1.0.0',
            layer: dataset.wmtsLayer,
            tilematrixset: 'EPSG:3857',
            tilematrix: String(tileMatrix),
            tilerow: String(tileRow),
            tilecol: String(tileCol),
            style: 'vectorStyle:solidAndVector,cmap:thermal',
            format: 'image/png',
            infoformat: 'application/json',
            i: String(i),
            j: String(j),
            time: time
        });

        return `${CmemsWmtsClient.BASE_URL}?${params.toString()}`;
    }

    /**
     * Convert a (lon, lat) pair to the (tilematrix=5, row, col, i, j)
     * coordinates of the pixel that contains it. Level 5 = 32×32 tiles
     * covering the globe = ~1.25° per pixel at the equator, which is
     * comfortably coarser than the 1/12° (~0.083°) dataset resolution
     * but fine enough for a stable upstream snap to the nearest model
     * cell. Level 0 was too coarse (1.4° per pixel, ambiguous near the
     * poles); levels >5 are unnecessary work for the server.
     *
     * Web Mercator is undefined past ±85.05113° latitude — we clamp
     * before projecting.
     * @private
     */
    private static _lonLatToTilePixel(longitude: number, latitude: number): {
        tileMatrix: number;
        tileRow: number;
        tileCol: number;
        i: number;
        j: number;
    } {
        const tileMatrix = 5;
        const tiles = 2 ** tileMatrix;
        const pixelsPerSide = 256 * tiles;
        const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
        const x = ((longitude + 180) / 360) * pixelsPerSide;
        const sinLat = Math.sin((clampedLat * Math.PI) / 180);
        const y = (0.5 - (Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI))) * pixelsPerSide;
        const tileCol = Math.min(tiles - 1, Math.max(0, Math.floor(x / 256)));
        const tileRow = Math.min(tiles - 1, Math.max(0, Math.floor(y / 256)));
        const i = Math.min(255, Math.max(0, Math.floor(x - (tileCol * 256))));
        const j = Math.min(255, Math.max(0, Math.floor(y - (tileRow * 256))));

        return {
            tileMatrix: tileMatrix,
            tileRow: tileRow,
            tileCol: tileCol,
            i: i,
            j: j
        };
    }

    /**
     * Parse the GeoJSON `FeatureCollection` from a `GetFeatureInfo`
     * response. Empty / malformed payloads degrade to null so a single
     * bad pixel doesn't poison the whole patch.
     * @private
     */
    private static _parsePointResponse(body: string): CmemsPointSample | null {
        try {
            const data = JSON.parse(body) as {
                features?: {
                    properties?: {
                        component1Value?: number | null;
                        component2Value?: number | null;
                    };
                }[];
            };

            const props = data.features?.[0]?.properties;

            if (props === undefined) {
                return null;
            }

            const rawU = props.component1Value ?? null;
            const rawV = props.component2Value ?? null;

            return {
                u: typeof rawU === 'number' && Number.isFinite(rawU) ? rawU : null,
                v: typeof rawV === 'number' && Number.isFinite(rawV) ? rawV : null
            };
        } catch (e) {
            Logger.getLogger().debug(`CmemsWmtsClient: parse failure: ${(e as Error).message}`);
            return null;
        }
    }

    /**
     * Round to `digits` fractional places.
     * @private
     */
    private static _round(x: number, digits: number): number {
        const factor = 10 ** digits;
        return Math.round(x * factor) / factor;
    }

}