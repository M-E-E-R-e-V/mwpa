import {Logger} from '@stefanwerfling/figtree';
import {SightingEnrichmentPatch} from '../../Db/MariaDb/Repositories/SightingEnrichmentRepository.js';
import {AstronomyEnricher} from './Enrichers/AstronomyEnricher.js';
import {BgcEnricher} from './Enrichers/BgcEnricher.js';
import {DerivedEnricher} from './Enrichers/DerivedEnricher.js';
import {HumanPressureEnricher} from './Enrichers/HumanPressureEnricher.js';
import {MeteoExtraEnricher} from './Enrichers/MeteoExtraEnricher.js';
import {TideEnricher} from './Enrichers/TideEnricher.js';
import {UpwellingEnricher} from './Enrichers/UpwellingEnricher.js';
import {Enricher, EnrichmentContext} from './Types.js';

/**
 * Merged output of running every enricher for one sighting.
 */
export type EnrichmentRunResult = {

    /**
     * Union of all enrichers' column patches (each owns a disjoint set).
     */
    fields: SightingEnrichmentPatch;

    /**
     * Union of all enrichers' provenance entries.
     */
    provenance: Record<string, string>;

    /**
     * True when at least one enricher threw an unexpected error. The service
     * then leaves `enrichment_last_update` unset so the row is retried on the
     * next tick (same "exception ⇒ retry" contract as the other services).
     */
    anyThrew: boolean;

};

/**
 * Ordered set of environmental enrichers run per sighting by the
 * EnrichmentService. Injectable for tests; defaults to the wired set.
 *
 * Enrichers are self-gating (a disabled one returns its `*_status:
 * 'no_provider'` rather than throwing), so the registry just runs each and
 * merges the disjoint column patches. A throwing enricher is logged and its
 * columns are skipped for this run.
 */
export class EnricherRegistry {

    private readonly _enrichers: Enricher[];

    public constructor(enrichers?: Enricher[]) {
        this._enrichers = enrichers ?? [
            new AstronomyEnricher(),
            new MeteoExtraEnricher(),
            new UpwellingEnricher(),
            new DerivedEnricher(),
            new BgcEnricher(),
            new TideEnricher(),
            new HumanPressureEnricher()
        ];
    }

    /**
     * Run every enricher and merge their contributions.
     */
    public async runAll(ctx: EnrichmentContext): Promise<EnrichmentRunResult> {
        const logger = Logger.getLogger();
        const fields: SightingEnrichmentPatch = {};
        const provenance: Record<string, string> = {};
        let anyThrew = false;

        for (const enricher of this._enrichers) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await enricher.enrich(ctx);
                Object.assign(fields, result.fields);
                Object.assign(provenance, result.provenance);
            } catch (e) {
                anyThrew = true;
                logger.warn(
                    `EnricherRegistry: '${enricher.getName()}' failed for ${ctx.sightingUnid} `
                    + `(${ctx.latitude},${ctx.longitude}@${ctx.isoDate}): ${(e as Error).message}`
                );
            }
        }

        return {fields: fields, provenance: provenance, anyThrew: anyThrew};
    }

}