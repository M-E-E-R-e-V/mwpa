import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaTypeSighting} from './TypeSighting.js';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SightingsFilterOrder
 */
export const SchemaSightingsFilterOrder = Vts.object({
    id: Vts.string(),
    tour_id: Vts.string(),
    date: Vts.string(),
    tour_start: Vts.string(),
    create_datetime: Vts.string(),
    update_datetime: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema SightingsFilterOrder
 */
export type SightingsFilterOrder = ExtractSchemaResultType<typeof SchemaSightingsFilterOrder>;

/**
 * Schema of SightingsFilter
 */
export const SchemaSightingsFilter = Vts.object({
    order: Vts.optional(SchemaSightingsFilterOrder),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
    period_from: Vts.optional(Vts.string({description: 'ISO date YYYY-MM-DD; lower bound for sighting date (inclusive)'})),
    period_to: Vts.optional(Vts.string({description: 'ISO date YYYY-MM-DD; upper bound for sighting date (inclusive)'})),
    species_id: Vts.optional(Vts.number({description: 'Filter by species id'})),
    organization_id: Vts.optional(Vts.number({description: 'Filter by organization id'})),
    vehicle_id: Vts.optional(Vts.number({description: 'Filter by vehicle id'})),
    vehicle_driver_id: Vts.optional(Vts.number({description: 'Filter by vehicle driver id'})),
    search: Vts.optional(Vts.string({description: 'Free-text search applied as LIKE on note + recognizable_animals'})),
    include_old: Vts.optional(Vts.boolean({description: 'When true, the list mixes in historical hand-maintained sightings (sighting_old) alongside the app sightings, ordered by date. Default off.'})),
}, {
    description: '',
});

/**
 * Type of schema SightingsFilter
 */
export type SightingsFilter = ExtractSchemaResultType<typeof SchemaSightingsFilter>;

/**
 * Schema of SightingsEntry
 * Sighting list entry — extends TypeSighting with response-side fields
 */
export const SchemaSightingsEntry = SchemaTypeSighting.extend({
    id: Vts.number(),
    creater_name: Vts.string(),
    create_datetime: Vts.number(),
    update_datetime: Vts.number(),
    device_id: Vts.number(),
    tour_id: Vts.number(),
    tour_fid: Vts.string(),
    hash: Vts.string(),
    hash_import_count: Vts.number(),
    source_import_file: Vts.string(),
    organization_id: Vts.number(),
    files: Vts.array(Vts.string()),
    pointtype: Vts.optional(Vts.string()),
    species_name: Vts.optional(Vts.string()),
    track_point_count: Vts.optional(Vts.number({description: 'Number of GPS tracking points the boat recorded during the sighting window (segment_count + 1 for source=\'tracking\', omitted for manual_begin_end / no movement row). Lets the list-UI show which sightings actually have a real GPS track.'})),
    is_old: Vts.optional(Vts.boolean({description: 'True when this entry comes from the hand-maintained historical table (sighting_old), not the app table. Drives the "old data" row badge + read-only in the list UI.'})),
}, {
    description: 'Sighting list entry — extends TypeSighting with response-side fields',
});

/**
 * Type of schema SightingsEntry
 */
export type SightingsEntry = ExtractSchemaResultType<typeof SchemaSightingsEntry>;

/**
 * Schema of SightingsListResponse
 */
export const SchemaSightingsListResponse = SchemaDefaultReturn.extend({
    filter: Vts.optional(SchemaSightingsFilter),
    offset: Vts.optional(Vts.number()),
    count: Vts.optional(Vts.number()),
    list: Vts.optional(Vts.array(SchemaSightingsEntry)),
}, {
    description: '',
});

/**
 * Type of schema SightingsListResponse
 */
export type SightingsListResponse = ExtractSchemaResultType<typeof SchemaSightingsListResponse>;

/**
 * Schema of SightingDeleteRequest
 */
export const SchemaSightingDeleteRequest = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema SightingDeleteRequest
 */
export type SightingDeleteRequest = ExtractSchemaResultType<typeof SchemaSightingDeleteRequest>;

/**
 * Schema of SightingGPSUpdateData
 */
export const SchemaSightingGPSUpdateData = Vts.object({
    notHaveLocation: Vts.array(Vts.number()),
    notHaveTimestamp: Vts.array(Vts.number()),
    haveSameDate: Vts.array(Vts.number()),
    newDate: Vts.array(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema SightingGPSUpdateData
 */
export type SightingGPSUpdateData = ExtractSchemaResultType<typeof SchemaSightingGPSUpdateData>;

/**
 * Schema of SightingGPSUpdateResponse
 */
export const SchemaSightingGPSUpdateResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaSightingGPSUpdateData),
}, {
    description: '',
});

/**
 * Type of schema SightingGPSUpdateResponse
 */
export type SightingGPSUpdateResponse = ExtractSchemaResultType<typeof SchemaSightingGPSUpdateResponse>;

/**
 * Schema of SightingWeatherRequest
 */
export const SchemaSightingWeatherRequest = Vts.object({
    id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema SightingWeatherRequest
 */
export type SightingWeatherRequest = ExtractSchemaResultType<typeof SchemaSightingWeatherRequest>;

/**
 * Schema of SightingImageGetRequest
 * Path params for /json/sightings/getimage/:id/:filename
 */
export const SchemaSightingImageGetRequest = Vts.object({
    id: Vts.number(),
    filename: Vts.string(),
}, {
    description: 'Path params for /json/sightings/getimage/:id/:filename',
});

/**
 * Type of schema SightingImageGetRequest
 */
export type SightingImageGetRequest = ExtractSchemaResultType<typeof SchemaSightingImageGetRequest>;

/**
 * Schema of SightingSaveRequest
 * Save payload of the web sighting dialog. id > 0 updates that sighting, id = 0 creates a new one. The extended fields (photo_taken … other_species) are optional: left out, an update keeps the stored value.
 */
export const SchemaSightingSaveRequest = Vts.object({
    id: Vts.number({description: 'Sighting id to update; 0 creates a new sighting.'}),
    vehicle_id: Vts.number(),
    vehicle_driver_id: Vts.number(),
    beaufort_wind: Vts.string({description: 'Stored in beaufort_wind_n column. May contain decimals like "1.5".'}),
    date: Vts.string(),
    tour_start: Vts.optional(Vts.string()),
    tour_end: Vts.optional(Vts.string()),
    duration_from: Vts.optional(Vts.string()),
    duration_until: Vts.optional(Vts.string()),
    location_begin: Vts.string({description: 'JSON-stringified GeolocationCoordinates ("null" or "" for unset).'}),
    location_end: Vts.optional(Vts.string({description: 'JSON-stringified GeolocationCoordinates ("null" or "" for unset).'})),
    species_id: Vts.number(),
    species_count: Vts.number(),
    reaction_id: Vts.number(),
    other: Vts.optional(Vts.string()),
    other_vehicle: Vts.optional(Vts.string()),
    note: Vts.optional(Vts.string()),
    photo_taken: Vts.optional(Vts.number({description: '1 yes, 0 no, -1 unknown.'})),
    distance_coast_estimation_gps: Vts.optional(Vts.number({description: 'Position estimated without GPS: 1 yes, 0 no, -1 unknown.'})),
    juveniles: Vts.optional(Vts.number({description: '1 yes, 0 no, -1 unknown.'})),
    calves: Vts.optional(Vts.number({description: '1 yes, 0 no, -1 unknown.'})),
    newborns: Vts.optional(Vts.number({description: '1 yes, 0 no, -1 unknown.'})),
    subgroups: Vts.optional(Vts.number({description: '1 yes, 0 no, -1 unknown.'})),
    group_structure_id: Vts.optional(Vts.number({description: '0 not set, 1 widely dispersed, 2 dispersed, 3 loose, 4 tight.'})),
    behaviours: Vts.optional(Vts.string({description: 'JSON id map of behavioural states, e.g. {"0":"2","1":"6"}.'})),
    freq_behaviour: Vts.optional(Vts.string({description: 'JSON list of free-text tags, e.g. ["breaching","tailslaps"].'})),
    recognizable_animals: Vts.optional(Vts.string({description: 'Free text about recognizable individuals.'})),
    other_species: Vts.optional(Vts.string({description: 'JSON id map of further species, e.g. {"0":"3"}.'})),
}, {
    description: 'Save payload of the web sighting dialog. id > 0 updates that sighting, id = 0 creates a new one. The extended fields (photo_taken … other_species) are optional: left out, an update keeps the stored value.',
});

/**
 * Type of schema SightingSaveRequest
 */
export type SightingSaveRequest = ExtractSchemaResultType<typeof SchemaSightingSaveRequest>;

/**
 * Schema of SightingYearsResponse
 */
export const SchemaSightingYearsResponse = SchemaDefaultReturn.extend({
    years: Vts.optional(Vts.array(Vts.number())),
}, {
    description: '',
});

/**
 * Type of schema SightingYearsResponse
 */
export type SightingYearsResponse = ExtractSchemaResultType<typeof SchemaSightingYearsResponse>;

/**
 * Schema of SightingHistoryRequest
 * Change history of one sighting.
 */
export const SchemaSightingHistoryRequest = Vts.object({
    id: Vts.number({description: 'Sighting id.'}),
}, {
    description: 'Change history of one sighting.',
});

/**
 * Type of schema SightingHistoryRequest
 */
export type SightingHistoryRequest = ExtractSchemaResultType<typeof SchemaSightingHistoryRequest>;

/**
 * Schema of SightingHistoryEntry
 * One changed field (or a create / delete event) from the history table.
 */
export const SchemaSightingHistoryEntry = Vts.object({
    id: Vts.number(),
    change_group: Vts.string({description: 'Groups the fields changed by one save.'}),
    action: Vts.string({description: '\'create\', \'update\' or \'delete\'.'}),
    field: Vts.string({description: 'Column name; empty for a create / delete event without field.'}),
    old_value: Vts.string(),
    new_value: Vts.string(),
    changer_id: Vts.number(),
    changer_name: Vts.string(),
    change_time: Vts.number({description: 'Unix seconds.'}),
    source: Vts.string({description: '\'web\' or \'mobile\'.'}),
}, {
    description: 'One changed field (or a create / delete event) from the history table.',
});

/**
 * Type of schema SightingHistoryEntry
 */
export type SightingHistoryEntry = ExtractSchemaResultType<typeof SchemaSightingHistoryEntry>;

/**
 * Schema of SightingHistoryResponse
 * Change history of a sighting, newest first.
 */
export const SchemaSightingHistoryResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSightingHistoryEntry),
}, {
    description: 'Change history of a sighting, newest first.',
});

/**
 * Type of schema SightingHistoryResponse
 */
export type SightingHistoryResponse = ExtractSchemaResultType<typeof SchemaSightingHistoryResponse>;

/**
 * Schema of SightingDetailsRequest
 * Computed / derived data of one sighting (read-only).
 */
export const SchemaSightingDetailsRequest = Vts.object({
    id: Vts.number({description: 'Sighting id.'}),
}, {
    description: 'Computed / derived data of one sighting (read-only).',
});

/**
 * Type of schema SightingDetailsRequest
 */
export type SightingDetailsRequest = ExtractSchemaResultType<typeof SchemaSightingDetailsRequest>;

/**
 * Schema of SightingDetailsItem
 * One value row: English label (translated in the UI), formatted values (one per group column, '' = no value) and unit.
 */
export const SchemaSightingDetailsItem = Vts.object({
    label: Vts.string(),
    values: Vts.array(Vts.string()),
    unit: Vts.string(),
    translate: Vts.boolean({description: 'True when the values are English texts the UI should translate (status words, phases).'}),
}, {
    description: 'One value row: English label (translated in the UI), formatted values (one per group column, \'\' = no value) and unit.',
});

/**
 * Type of schema SightingDetailsItem
 */
export type SightingDetailsItem = ExtractSchemaResultType<typeof SchemaSightingDetailsItem>;

/**
 * Schema of SightingDetailsGroup
 * A block of values from one source / service with its status and last update.
 */
export const SchemaSightingDetailsGroup = Vts.object({
    title: Vts.string({description: 'English title, or a data text (vessel name, quake place) when title_raw is true.'}),
    title_raw: Vts.boolean(),
    status: Vts.string({description: 'Service status (\'\' = not run yet, \'ok\', \'no_data\', ...).'}),
    updated: Vts.number({description: 'Unix seconds of the last computation, 0 = unknown.'}),
    columns: Vts.array(Vts.string({description: 'English column titles when items carry more than one value (e.g. day mean / at hour).'})),
    items: Vts.array(SchemaSightingDetailsItem),
}, {
    description: 'A block of values from one source / service with its status and last update.',
});

/**
 * Type of schema SightingDetailsGroup
 */
export type SightingDetailsGroup = ExtractSchemaResultType<typeof SchemaSightingDetailsGroup>;

/**
 * Schema of SightingDetailsSection
 * One sub tab of the computed data (meta, weather, sea, ...).
 */
export const SchemaSightingDetailsSection = Vts.object({
    key: Vts.string(),
    title: Vts.string(),
    groups: Vts.array(SchemaSightingDetailsGroup),
}, {
    description: 'One sub tab of the computed data (meta, weather, sea, ...).',
});

/**
 * Type of schema SightingDetailsSection
 */
export type SightingDetailsSection = ExtractSchemaResultType<typeof SchemaSightingDetailsSection>;

/**
 * Schema of SightingDetailsResponse
 * Computed / derived data of a sighting, grouped in sections.
 */
export const SchemaSightingDetailsResponse = SchemaDefaultReturn.extend({
    sections: Vts.array(SchemaSightingDetailsSection),
}, {
    description: 'Computed / derived data of a sighting, grouped in sections.',
});

/**
 * Type of schema SightingDetailsResponse
 */
export type SightingDetailsResponse = ExtractSchemaResultType<typeof SchemaSightingDetailsResponse>;