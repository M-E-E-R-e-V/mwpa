import {CoastalComponent} from '../../Currents/CoastalComponent.js';
import {Enricher, EnricherResult, EnrichmentContext} from '../Types.js';

/**
 * Coastal upwelling-index enricher (Bakun style). Derives the offshore
 * Ekman transport driven by the day wind and projects it onto the offshore
 * coast normal — no external fetch, it reuses the day wind already stored
 * by the WeatherService and the land/sea coast probe from CoastalComponent.
 *
 *   wind-stress   τ  = ρ_air · Cd · |U| · U⃗            (U⃗ = wind vector)
 *   Ekman transp. M⃗ = (τ_y, −τ_x) / (ρ_water · f)       (per metre of coast)
 *   index         = (M⃗ · n̂_offshore) · 100              (m³/s per 100 m coast)
 *
 * Positive = offshore transport = upwelling-favourable; negative =
 * downwelling. The sign of the Coriolis parameter f handles both
 * hemispheres. NULL (status 'no_data') when the wind is unknown, no coast
 * normal resolves (open ocean), or the latitude is too low for a stable f.
 */
export class UpwellingEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'ekman';

    /**
     * Air density (kg/m³).
     * @private
     */
    private static readonly RHO_AIR = 1.22;

    /**
     * Sea-water density (kg/m³).
     * @private
     */
    private static readonly RHO_WATER = 1025;

    /**
     * Surface drag coefficient (dimensionless).
     * @private
     */
    private static readonly DRAG = 0.0013;

    /**
     * Earth angular velocity (rad/s).
     * @private
     */
    private static readonly OMEGA = 7.2921e-5;

    /**
     * Below this absolute latitude the Coriolis parameter is too small for
     * a meaningful Ekman index — report no_data instead of a blow-up.
     * @private
     */
    private static readonly MIN_ABS_LAT_DEG = 2.5;

    public getName(): string {
        return UpwellingEnricher.NAME;
    }

    public async enrich(ctx: EnrichmentContext): Promise<EnricherResult> {
        const speed = ctx.existing.windSpeedMsDay;
        const fromDir = ctx.existing.windDirectionDegDay;

        if (speed === null || fromDir === null || !Number.isFinite(speed) || !Number.isFinite(fromDir)) {
            return {fields: {upwelling_status: 'no_data'}, provenance: {}};
        }

        if (Math.abs(ctx.latitude) < UpwellingEnricher.MIN_ABS_LAT_DEG) {
            return {fields: {upwelling_status: 'no_data'}, provenance: {}};
        }

        const normal = CoastalComponent.offshoreNormal(ctx.latitude, ctx.longitude);

        if (normal === null) {
            return {fields: {upwelling_status: 'no_data'}, provenance: {}};
        }

        // Wind blows TOWARD (meteorological direction is where it comes FROM).
        const toRad = (fromDir + 180) * Math.PI / 180;
        const windEast = speed * Math.sin(toRad);
        const windNorth = speed * Math.cos(toRad);

        // Wind stress vector τ = ρ_air · Cd · |U| · U⃗.
        const stressFactor = UpwellingEnricher.RHO_AIR * UpwellingEnricher.DRAG * speed;
        const tauEast = stressFactor * windEast;
        const tauNorth = stressFactor * windNorth;

        // Coriolis parameter (signed by hemisphere).
        const f = 2 * UpwellingEnricher.OMEGA * Math.sin(ctx.latitude * Math.PI / 180);

        // Ekman transport per metre of coast: M = (τ_y, −τ_x) / (ρ_w · f).
        const denom = UpwellingEnricher.RHO_WATER * f;
        const mEast = tauNorth / denom;
        const mNorth = -tauEast / denom;

        // Offshore component, scaled to m³/s per 100 m of coastline.
        const index = ((mEast * normal.east) + (mNorth * normal.north)) * 100;

        return {
            fields: {
                upwelling_index_day: Math.round(index * 1000) / 1000,
                upwelling_status: 'ok'
            },
            provenance: {
                upwelling_index_day: UpwellingEnricher.NAME
            }
        };
    }

}