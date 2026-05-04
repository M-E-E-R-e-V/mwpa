import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema of TypeSighting
 * Common sighting properties shared between web and mobile request/response shapes
 */
export const SchemaTypeSighting = Vts.object({
    unid: Vts.optional(Vts.string()),
    creater_id: Vts.optional(Vts.number()),
    vehicle_id: Vts.optional(Vts.number()),
    vehicle_driver_id: Vts.optional(Vts.number()),
    beaufort_wind: Vts.optional(Vts.string()),
    date: Vts.optional(Vts.string()),
    tour_start: Vts.optional(Vts.string()),
    tour_end: Vts.optional(Vts.string()),
    duration_from: Vts.optional(Vts.string()),
    duration_until: Vts.optional(Vts.string()),
    location_begin: Vts.optional(Vts.string()),
    location_end: Vts.optional(Vts.string()),
    photo_taken: Vts.optional(Vts.number()),
    distance_coast: Vts.optional(Vts.string()),
    distance_coast_estimation_gps: Vts.optional(Vts.number()),
    species_id: Vts.optional(Vts.number()),
    species_count: Vts.optional(Vts.number()),
    juveniles: Vts.optional(Vts.number()),
    calves: Vts.optional(Vts.number()),
    newborns: Vts.optional(Vts.number()),
    behaviours: Vts.optional(Vts.string()),
    subgroups: Vts.optional(Vts.number()),
    group_structure_id: Vts.optional(Vts.number()),
    reaction_id: Vts.optional(Vts.number()),
    freq_behaviour: Vts.optional(Vts.string()),
    recognizable_animals: Vts.optional(Vts.string()),
    other_species: Vts.optional(Vts.string()),
    other: Vts.optional(Vts.string()),
    other_vehicle: Vts.optional(Vts.string()),
    note: Vts.optional(Vts.string()),
    sightingType: Vts.optional(Vts.number()),
    tour_fid: Vts.optional(Vts.string({description: 'Sent by the mobile client (computed client-side); the server recomputes via UtilTourFid.createTourFid and ignores this value, but Vts strict mode requires the field to be declared.'})),
    image: Vts.optional(Vts.string({description: 'Local image filename on the mobile client. Sent by the app, ignored by the server (image upload happens via /mobile/sighting/image/save).'})),
    beaufort_wind_old: Vts.optional(Vts.number({description: 'Legacy numeric beaufort field — mobile always sends 0 to "reset" the deprecated column. Server ignores it.'})),
}, {
    description: 'Common sighting properties shared between web and mobile request/response shapes',
});

/**
 * Type of schema TypeSighting
 */
export type TypeSighting = ExtractSchemaResultType<typeof SchemaTypeSighting>;