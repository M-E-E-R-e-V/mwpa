import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SightingFishingVesselEntry
 * One fishing vessel that was active in the 25 km buffer of a sighting on the sighting day, as reported by GFW. Hours = apparent fishing hours of THIS vessel inside the buffer that day.
 */
export const SchemaSightingFishingVesselEntry = Vts.object({
    sighting_id: Vts.number(),
    vessel_id: Vts.string({description: 'GFW vessel id (stable across reports). Use for /vessels/{id} lookups.'}),
    name: Vts.optional(Vts.string({description: 'Vessel name from GFW /vessels/{id} enrichment; empty when not yet fetched.'})),
    mmsi: Vts.optional(Vts.string()),
    flag: Vts.optional(Vts.string({description: 'ISO-3 country code (ESP, MAR, JPN, ...).'})),
    gear_type: Vts.optional(Vts.string({description: 'GFW gear-type code: trawlers, longliners, purse_seines, drifting_longlines, ...'})),
    hours: Vts.number({description: 'Apparent fishing hours this vessel logged inside the 25 km buffer on the sighting day.'}),
}, {
    description: 'One fishing vessel that was active in the 25 km buffer of a sighting on the sighting day, as reported by GFW. Hours = apparent fishing hours of THIS vessel inside the buffer that day.',
});

/**
 * Type of schema SightingFishingVesselEntry
 */
export type SightingFishingVesselEntry = ExtractSchemaResultType<typeof SchemaSightingFishingVesselEntry>;

/**
 * Schema of SightingFishingVesselListRequest
 * Bulk-fetch fishing vessels for a set of sighting ids — same shape as SightingMovementListRequest so the frontend pattern can be reused.
 */
export const SchemaSightingFishingVesselListRequest = Vts.object({
    sighting_ids: Vts.array(Vts.number()),
}, {
    description: 'Bulk-fetch fishing vessels for a set of sighting ids — same shape as SightingMovementListRequest so the frontend pattern can be reused.',
});

/**
 * Type of schema SightingFishingVesselListRequest
 */
export type SightingFishingVesselListRequest = ExtractSchemaResultType<typeof SchemaSightingFishingVesselListRequest>;

/**
 * Schema of SightingFishingVesselListResponse
 * Fishing vessels grouped by sighting_id. Sightings with no vessels (no fishing activity / no GFW data / sighting not yet processed) are absent from the list.
 */
export const SchemaSightingFishingVesselListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSightingFishingVesselEntry),
}, {
    description: 'Fishing vessels grouped by sighting_id. Sightings with no vessels (no fishing activity / no GFW data / sighting not yet processed) are absent from the list.',
});

/**
 * Type of schema SightingFishingVesselListResponse
 */
export type SightingFishingVesselListResponse = ExtractSchemaResultType<typeof SchemaSightingFishingVesselListResponse>;