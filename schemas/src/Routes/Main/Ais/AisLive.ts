import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of AisLiveBbox
 * Bounding box filter for the live AIS list endpoint. Empty omits the spatial filter.
 */
export const SchemaAisLiveBbox = Vts.object({
    min_lat: Vts.number(),
    max_lat: Vts.number(),
    min_lon: Vts.number(),
    max_lon: Vts.number(),
}, {
    description: 'Bounding box filter for the live AIS list endpoint. Empty omits the spatial filter.',
});

/**
 * Type of schema AisLiveBbox
 */
export type AisLiveBbox = ExtractSchemaResultType<typeof SchemaAisLiveBbox>;

/**
 * Schema of AisLiveListRequest
 * Request for the live-AIS list endpoint — restricts by recency and optional bounding box.
 */
export const SchemaAisLiveListRequest = Vts.object({
    max_age_seconds: Vts.optional(Vts.number({description: 'Max seconds since the latest ping (default 3600 = 1 h). Beyond this a vessel is "stale" and dropped from the response.'})),
    bbox: Vts.optional(SchemaAisLiveBbox),
}, {
    description: 'Request for the live-AIS list endpoint — restricts by recency and optional bounding box.',
});

/**
 * Type of schema AisLiveListRequest
 */
export type AisLiveListRequest = ExtractSchemaResultType<typeof SchemaAisLiveListRequest>;

/**
 * Schema of AisLiveVesselEntry
 * Most recent ping per MMSI joined with the static AisVessel metadata. One row per vessel currently in the live buffer.
 */
export const SchemaAisLiveVesselEntry = Vts.object({
    mmsi: Vts.string(),
    name: Vts.optional(Vts.string()),
    flag: Vts.optional(Vts.string()),
    ship_type: Vts.optional(Vts.number({description: 'AIS ship-type code (1..99 per ITU-R M.1371).'})),
    lat: Vts.number(),
    lon: Vts.number(),
    sog: Vts.optional(Vts.number({description: 'Speed over ground in knots; absent when AIS reports "not available".'})),
    cog: Vts.optional(Vts.number({description: 'Course over ground in degrees (0..360); absent when AIS reports "not available".'})),
    received_at: Vts.number({description: 'Unix-seconds timestamp of the most recent ping.'}),
}, {
    description: 'Most recent ping per MMSI joined with the static AisVessel metadata. One row per vessel currently in the live buffer.',
});

/**
 * Type of schema AisLiveVesselEntry
 */
export type AisLiveVesselEntry = ExtractSchemaResultType<typeof SchemaAisLiveVesselEntry>;

/**
 * Schema of AisLiveListResponse
 * List of live AIS vessels.
 */
export const SchemaAisLiveListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaAisLiveVesselEntry),
}, {
    description: 'List of live AIS vessels.',
});

/**
 * Type of schema AisLiveListResponse
 */
export type AisLiveListResponse = ExtractSchemaResultType<typeof SchemaAisLiveListResponse>;

/**
 * Schema of AisVesselTrackPoint
 * One downsampled ping from the live buffer — used to draw the vessel's historical track on the live map.
 */
export const SchemaAisVesselTrackPoint = Vts.object({
    lat: Vts.number(),
    lon: Vts.number(),
    sog: Vts.optional(Vts.number()),
    cog: Vts.optional(Vts.number()),
    received_at: Vts.number({description: 'Unix seconds.'}),
}, {
    description: 'One downsampled ping from the live buffer — used to draw the vessel\'s historical track on the live map.',
});

/**
 * Type of schema AisVesselTrackPoint
 */
export type AisVesselTrackPoint = ExtractSchemaResultType<typeof SchemaAisVesselTrackPoint>;

/**
 * Schema of AisVesselTrackResponse
 * Chronological track (oldest → newest) for one MMSI inside the requested time window.
 */
export const SchemaAisVesselTrackResponse = SchemaDefaultReturn.extend({
    mmsi: Vts.string(),
    points: Vts.array(SchemaAisVesselTrackPoint),
}, {
    description: 'Chronological track (oldest → newest) for one MMSI inside the requested time window.',
});

/**
 * Type of schema AisVesselTrackResponse
 */
export type AisVesselTrackResponse = ExtractSchemaResultType<typeof SchemaAisVesselTrackResponse>;

/**
 * Schema of AisVesselTrackRequest
 * Track request — MMSI + optional time-window override.
 */
export const SchemaAisVesselTrackRequest = Vts.object({
    mmsi: Vts.string(),
    since_seconds: Vts.optional(Vts.number({description: 'How far back to fetch (default 3600 = 1 h). Capped by the live-buffer retention.'})),
}, {
    description: 'Track request — MMSI + optional time-window override.',
});

/**
 * Type of schema AisVesselTrackRequest
 */
export type AisVesselTrackRequest = ExtractSchemaResultType<typeof SchemaAisVesselTrackRequest>;