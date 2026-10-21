import {BathymetryProviderRegistry} from '../../Bathymetry/BathymetryProviderRegistry.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {Enricher, EnricherResult, EnrichmentContext} from '../Types.js';

/**
 * Open-Meteo marine hourly block (SST only — the stencil probe).
 */
type MarineHourly = {
    sea_surface_temperature?: (number | null)[];
};

type MarineResponse = {
    hourly?: MarineHourly;
};

/**
 * Spatial-derivative enricher — quantities that need neighbouring samples,
 * not just the point value:
 *
 *   - seabed_slope_deg + shelf_distance_km: both from one 4-point bathymetry
 *     stencil (N/E/S/W), via the same BathymetryProviderRegistry the
 *     DepthService uses — the shelf distance is a local-linear estimate to
 *     the 200 m isobath, no extra calls.
 *   - sst_front_grad_c_km_day: SST horizontal gradient (thermal-front
 *     strength) from Open-Meteo SST at the centre + one eastward + one
 *     northward neighbour.
 *
 * Deliberately NOT computed here (column stays null): the chlorophyll front —
 * its ERDDAP source is flaky/offline and a stencil there is 3 calls/point. The
 * column exists so it can be filled later without a schema change.
 *
 * This is the costliest enricher (several upstream calls per sighting), which
 * is why the service's per-tick budget is modest.
 */
export class DerivedEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'derived';

    /**
     * Stencil half-step (km) for the finite differences. ~2 km is coarse
     * enough for the bathymetry/SST grids yet local to the sighting.
     * @private
     */
    private static readonly STEP_KM = 2;

    /**
     * Metres per degree of latitude (mean).
     * @private
     */
    private static readonly M_PER_DEG_LAT = 111320;

    /**
     * Isobath (m) taken as the shelf break for the shelf-distance estimate.
     * @private
     */
    private static readonly SHELF_ISOBATH_M = 200;

    /**
     * Minimum seabed gradient (m per m horizontal) for a meaningful
     * shelf-distance estimate — below this the seabed is effectively flat
     * and the local-linear projection to the isobath is unreliable (null).
     * @private
     */
    private static readonly MIN_GRADIENT_M_PER_M = 1e-4;

    /**
     * Cap (km) on the shelf-distance estimate; beyond this the local-linear
     * extrapolation is not trustworthy and the value is dropped (null).
     * @private
     */
    private static readonly MAX_SHELF_KM = 500;

    private readonly _bathymetry: BathymetryProviderRegistry;

    private readonly _limiter = new RateLimiter(1200);

    public constructor(bathymetry?: BathymetryProviderRegistry) {
        this._bathymetry = bathymetry ?? new BathymetryProviderRegistry();
    }

    public getName(): string {
        return DerivedEnricher.NAME;
    }

    public async enrich(ctx: EnrichmentContext): Promise<EnricherResult> {
        const fields: EnricherResult['fields'] = {derived_status: 'no_data'};
        const provenance: Record<string, string> = {};

        const seabed = await this._seabedStencil(ctx);

        if (seabed.slopeDeg !== null) {
            fields.seabed_slope_deg = DerivedEnricher._round(seabed.slopeDeg, 2);
            provenance.seabed_slope_deg = DerivedEnricher.NAME;
        }

        if (seabed.shelfDistanceKm !== null) {
            fields.shelf_distance_km = DerivedEnricher._round(seabed.shelfDistanceKm, 2);
            provenance.shelf_distance_km = DerivedEnricher.NAME;
        }

        const sstGrad = await this._sstFront(ctx);

        if (sstGrad !== null) {
            fields.sst_front_grad_c_km_day = DerivedEnricher._round(sstGrad, 4);
            provenance.sst_front_grad_c_km_day = DerivedEnricher.NAME;
        }

        if (Object.keys(provenance).length > 0) {
            fields.derived_status = 'ok';
        }

        return {fields: fields, provenance: provenance};
    }

    /**
     * Seabed slope (degrees) and distance to the shelf-break isobath (km)
     * from one central-difference bathymetry stencil (N/E/S/W).
     *
     * Both reuse the same four depth samples — no extra calls. The shelf
     * distance is a local-linear estimate: with the seabed gradient magnitude
     * |∇z| (m per m horizontal) and the centre depth, the horizontal distance
     * to the 200 m isobath is |200 − depth| / |∇z|. It is dropped (null) on a
     * near-flat seabed or beyond MAX_SHELF_KM, where the linear extrapolation
     * stops being trustworthy. Returns nulls if any neighbour is land /
     * unavailable.
     * @private
     */
    private async _seabedStencil(ctx: EnrichmentContext): Promise<{slopeDeg: number | null; shelfDistanceKm: number | null;}> {
        const offsets = DerivedEnricher._degOffsets(ctx.latitude);

        const [north, south, east, west] = await Promise.all([
            this._bathymetry.getDepth(ctx.latitude + offsets.dLat, ctx.longitude),
            this._bathymetry.getDepth(ctx.latitude - offsets.dLat, ctx.longitude),
            this._bathymetry.getDepth(ctx.latitude, ctx.longitude + offsets.dLon),
            this._bathymetry.getDepth(ctx.latitude, ctx.longitude - offsets.dLon)
        ]);

        if (north === null || south === null || east === null || west === null) {
            return {slopeDeg: null, shelfDistanceKm: null};
        }

        // depth_m is positive-down; the step between opposite samples is 2·STEP.
        const stepM = 2 * DerivedEnricher.STEP_KM * 1000;
        const dzdx = (east.depth_m - west.depth_m) / stepM;
        const dzdy = (north.depth_m - south.depth_m) / stepM;
        const gradient = Math.sqrt((dzdx * dzdx) + (dzdy * dzdy));
        const slopeDeg = (Math.atan(gradient) * 180) / Math.PI;

        // Centre depth: prefer the already-stored value, else the stencil mean.
        const centreDepth = ctx.existing.depthM === null
            ? (north.depth_m + south.depth_m + east.depth_m + west.depth_m) / 4
            : ctx.existing.depthM;

        let shelfDistanceKm: number | null = null;

        if (gradient >= DerivedEnricher.MIN_GRADIENT_M_PER_M) {
            const distanceKm = Math.abs(DerivedEnricher.SHELF_ISOBATH_M - centreDepth) / gradient / 1000;

            if (distanceKm <= DerivedEnricher.MAX_SHELF_KM) {
                shelfDistanceKm = distanceKm;
            }
        }

        return {slopeDeg: slopeDeg, shelfDistanceKm: shelfDistanceKm};
    }

    /**
     * SST horizontal-gradient magnitude (°C/km) from Open-Meteo SST at the
     * centre, one eastward and one northward neighbour (forward difference).
     * Reuses the stored centre SST when present to save a call. Null when any
     * required sample is missing.
     * @private
     */
    private async _sstFront(ctx: EnrichmentContext): Promise<number | null> {
        const offsets = DerivedEnricher._degOffsets(ctx.latitude);

        const [centre, east, north] = await Promise.all([
            ctx.existing.sstCDay === null
                ? this._fetchSst(ctx.latitude, ctx.longitude, ctx.isoDate)
                : Promise.resolve(ctx.existing.sstCDay),
            this._fetchSst(ctx.latitude, ctx.longitude + offsets.dLon, ctx.isoDate),
            this._fetchSst(ctx.latitude + offsets.dLat, ctx.longitude, ctx.isoDate)
        ]);

        if (centre === null || east === null || north === null) {
            return null;
        }

        const dtdx = (east - centre) / DerivedEnricher.STEP_KM;
        const dtdy = (north - centre) / DerivedEnricher.STEP_KM;

        return Math.sqrt((dtdx * dtdx) + (dtdy * dtdy));
    }

    /**
     * Day-mean SST (°C) at a point from Open-Meteo marine, or null.
     * @private
     */
    private async _fetchSst(latitude: number, longitude: number, isoDate: string): Promise<number | null> {
        const params = new URLSearchParams({
            latitude: `${latitude}`,
            longitude: `${longitude}`,
            start_date: isoDate,
            end_date: isoDate,
            hourly: 'sea_surface_temperature',
            timezone: 'auto'
        });

        const url = `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`;
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        try {
            const body = JSON.parse(response.body) as MarineResponse;
            return DerivedEnricher._mean(body.hourly?.sea_surface_temperature);
        } catch {
            return null;
        }
    }

    /**
     * Latitude/longitude step (degrees) for STEP_KM at this latitude.
     * @private
     */
    private static _degOffsets(latDeg: number): {dLat: number; dLon: number;} {
        const dLat = (DerivedEnricher.STEP_KM * 1000) / DerivedEnricher.M_PER_DEG_LAT;
        const cosLat = Math.cos((latDeg * Math.PI) / 180);
        const dLon = Math.abs(cosLat) < 1e-9 ? dLat : dLat / cosLat;

        return {dLat: dLat, dLon: dLon};
    }

    /**
     * Mean of the finite numbers in xs, or null if none.
     * @private
     */
    private static _mean(xs: (number | null)[] | undefined): number | null {
        if (!xs) {
            return null;
        }

        let sum = 0;
        let count = 0;

        for (const x of xs) {
            if (x !== null && Number.isFinite(x)) {
                sum += x;
                count++;
            }
        }

        return count === 0 ? null : sum / count;
    }

    /**
     * Round to `digits` decimals.
     * @private
     */
    private static _round(value: number, digits: number): number {
        const factor = 10 ** digits;

        return Math.round(value * factor) / factor;
    }

}