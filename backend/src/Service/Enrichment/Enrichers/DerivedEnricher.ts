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
 *   - seabed_slope_deg: seabed gradient from a 4-point bathymetry stencil
 *     (N/E/S/W around the sighting), via the same BathymetryProviderRegistry
 *     the DepthService uses.
 *   - sst_front_grad_c_km_day: SST horizontal gradient (thermal-front
 *     strength) from Open-Meteo SST at the centre + one eastward + one
 *     northward neighbour.
 *
 * Deliberately NOT computed here (columns stay null): the chlorophyll front
 * (its ERDDAP source is flaky/offline and a stencil there is 3 calls/point)
 * and the shelf-break distance (needs an outward isobath search — a separate
 * lower-cadence job). Those columns exist so they can be filled later without
 * a schema change.
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

        const slope = await this._seabedSlope(ctx);

        if (slope !== null) {
            fields.seabed_slope_deg = DerivedEnricher._round(slope, 2);
            provenance.seabed_slope_deg = DerivedEnricher.NAME;
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
     * Seabed slope (degrees) from a central-difference bathymetry stencil.
     * Returns null if any of the four neighbours is land / unavailable.
     * @private
     */
    private async _seabedSlope(ctx: EnrichmentContext): Promise<number | null> {
        const offsets = DerivedEnricher._degOffsets(ctx.latitude);

        const [north, south, east, west] = await Promise.all([
            this._bathymetry.getDepth(ctx.latitude + offsets.dLat, ctx.longitude),
            this._bathymetry.getDepth(ctx.latitude - offsets.dLat, ctx.longitude),
            this._bathymetry.getDepth(ctx.latitude, ctx.longitude + offsets.dLon),
            this._bathymetry.getDepth(ctx.latitude, ctx.longitude - offsets.dLon)
        ]);

        if (north === null || south === null || east === null || west === null) {
            return null;
        }

        // depth_m is positive-down; the step between opposite samples is 2·STEP.
        const stepM = 2 * DerivedEnricher.STEP_KM * 1000;
        const dzdx = (east.depth_m - west.depth_m) / stepM;
        const dzdy = (north.depth_m - south.depth_m) / stepM;
        const gradient = Math.sqrt((dzdx * dzdx) + (dzdy * dzdy));

        return (Math.atan(gradient) * 180) / Math.PI;
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