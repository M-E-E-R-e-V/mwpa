import {SightingEnrichmentPatch} from '../../Db/MariaDb/Repositories/SightingEnrichmentRepository.js';

/**
 * Values already computed for the sighting by the other services
 * (read from `sighting_extended`). Passed to enrichers that derive their
 * output from existing samples instead of fetching fresh data — e.g. the
 * upwelling index needs the day wind, the SST-front check reuses nothing
 * but could cross-check the stored SST.
 */
export type EnrichmentExisting = {

    /**
     * Day-mean sea-surface temperature (°C), or null if not yet known.
     */
    sstCDay: number | null;

    /**
     * Day-mean wind speed at 10 m (m/s), or null.
     */
    windSpeedMsDay: number | null;

    /**
     * Day circular-mean wind direction (degrees FROM), or null.
     */
    windDirectionDegDay: number | null;

    /**
     * Seabed depth (m, positive down), or null.
     */
    depthM: number | null;

};

/**
 * Everything an enricher needs about one sighting.
 */
export type EnrichmentContext = {

    /**
     * Stable sighting id (unid). The enrichment row keys on this.
     */
    sightingUnid: string;

    /**
     * Sighting latitude (WGS84).
     */
    latitude: number;

    /**
     * Sighting longitude (WGS84).
     */
    longitude: number;

    /**
     * Sighting date, 'YYYY-MM-DD' (already validated).
     */
    isoDate: string;

    /**
     * Local clock time of the sighting, 'HH:mm', or null when the record
     * has no usable time. Enrichers that need an instant (solar elevation)
     * skip gracefully when null.
     */
    timeHHmm: string | null;

    /**
     * Samples already stored for this sighting (from sighting_extended).
     */
    existing: EnrichmentExisting;

};

/**
 * What one enricher contributes: the columns it owns (ALWAYS including its
 * own `*_status` column) and the per-field provenance entries for any value
 * it actually produced. Enrichers are self-gating — a disabled one returns
 * its `*_status: 'no_provider'` and no value columns rather than throwing.
 */
export type EnricherResult = {

    /**
     * Column patch this enricher owns. Must set its own status column.
     */
    fields: SightingEnrichmentPatch;

    /**
     * value-column → source-id provenance for produced values only.
     */
    provenance: Record<string, string>;

};

/**
 * A single environmental enricher. Implementations live in
 * `Service/Enrichment/Enrichers/`. Each owns a disjoint set of columns on
 * `sighting_enrichment` plus the matching `*_status` column.
 */
export interface Enricher {

    /**
     * Stable enricher id (used in provenance and logs).
     */
    getName(): string;

    /**
     * Compute this enricher's contribution for the sighting. Never throws
     * for routine "no data" / "disabled" cases — returns a result whose
     * status column records the outcome. May throw only on unexpected
     * upstream errors, which the service logs and retries next tick.
     */
    enrich(ctx: EnrichmentContext): Promise<EnricherResult>;

}