import {Enricher, EnricherResult} from '../Types.js';

/**
 * Tide enricher (Tier 2) — tidal height + phase (flood/ebb/high/low) at the
 * sighting datetime.
 *
 * SCAFFOLD, gated OFF by default. There is no reliable, global, key-free
 * point-value tide endpoint: harmonic models (FES2014 / TPXO) need the model
 * data shipped alongside the app, and the hosted APIs (WorldTides, Stormglass)
 * need an API key and are rate-limited. Rather than ship an unverifiable call,
 * this enricher reports `no_provider` until `MWPA_ENRICH_TIDE_BASE` (and, if
 * the chosen provider needs it, `MWPA_ENRICH_TIDE_KEY`) are configured and the
 * lookup is wired into the enabled branch. Columns `tide_height_m` /
 * `tide_phase` already exist, so enabling is additive.
 */
export class TideEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'tide';

    /**
     * Env var holding the tide provider base URL. Absent → disabled.
     * @private
     */
    private static readonly BASE_ENV = 'MWPA_ENRICH_TIDE_BASE';

    public getName(): string {
        return TideEnricher.NAME;
    }

    public async enrich(): Promise<EnricherResult> {
        const base = process.env[TideEnricher.BASE_ENV];

        if (base === undefined || base.trim() === '') {
            return {fields: {tide_status: 'no_provider'}, provenance: {}};
        }

        // Enabled but the provider-specific request/parse is not wired yet.
        return {fields: {tide_status: 'no_data'}, provenance: {}};
    }

}