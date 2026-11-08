import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultMobileV1Return} from '../Base/DefaultMobileV1Return.js';

/**
 * Schema of TrackingAreaHomeData
 */
export const SchemaTrackingAreaHomeData = Vts.object({
    coordinates: Vts.array(Vts.or([Vts.array(Vts.number())], {description: 'Polygon outer ring as number[][] — list of [lon, lat] pairs (wire format kept compatible with the production mobile client which expects element[0]=lon, element[1]=lat).'})),
    organization_id: Vts.number(),
    create_datetime: Vts.number(),
    update_datetime: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema TrackingAreaHomeData
 */
export type TrackingAreaHomeData = ExtractSchemaResultType<typeof SchemaTrackingAreaHomeData>;

/**
 * Schema of TrackingAreaHomeResponse
 */
export const SchemaTrackingAreaHomeResponse = SchemaDefaultMobileV1Return.extend({
    data: Vts.optional(SchemaTrackingAreaHomeData),
}, {
    description: '',
});

/**
 * Type of schema TrackingAreaHomeResponse
 */
export type TrackingAreaHomeResponse = ExtractSchemaResultType<typeof SchemaTrackingAreaHomeResponse>;

/**
 * Schema of MobileCoastlineRequest
 * Body of POST /mobile/coastline. The coast lines are loaded for the home area of the organization; without one for the cell around the given position (last known GPS position of the device).
 */
export const SchemaMobileCoastlineRequest = Vts.object({
    latitude: Vts.optional(Vts.number({description: 'Last known latitude of the device, used only when the organization has no home area.'})),
    longitude: Vts.optional(Vts.number({description: 'Last known longitude of the device, used only when the organization has no home area.'})),
}, {
    description: 'Body of POST /mobile/coastline. The coast lines are loaded for the home area of the organization; without one for the cell around the given position (last known GPS position of the device).',
});

/**
 * Type of schema MobileCoastlineRequest
 */
export type MobileCoastlineRequest = ExtractSchemaResultType<typeof SchemaMobileCoastlineRequest>;

/**
 * Schema of MobileCoastlineData
 * Coast lines (OpenStreetMap natural=coastline, ODbL) around the area, simplified. status: ok = lines are complete for the box, pending = the server is loading them (ask again later), error = loading failed, no_area = neither home area nor position.
 */
export const SchemaMobileCoastlineData = Vts.object({
    status: Vts.string(),
    area_key: Vts.string({description: 'Identifies area and box; changes when the home area changes.'}),
    south: Vts.number(),
    west: Vts.number(),
    north: Vts.number(),
    east: Vts.number(),
    lines: Vts.optional(Vts.array(Vts.or([Vts.array(Vts.number())], {description: 'One flat [lat, lon, lat, lon, ...] list per coast line, clipped to the box.'}))),
    fetch_datetime: Vts.number({description: 'Seconds-epoch when the lines were loaded from OpenStreetMap, 0 if not yet.'}),
}, {
    description: 'Coast lines (OpenStreetMap natural=coastline, ODbL) around the area, simplified. status: ok = lines are complete for the box, pending = the server is loading them (ask again later), error = loading failed, no_area = neither home area nor position.',
});

/**
 * Type of schema MobileCoastlineData
 */
export type MobileCoastlineData = ExtractSchemaResultType<typeof SchemaMobileCoastlineData>;

/**
 * Schema of MobileCoastlineResponse
 * Response of POST /mobile/coastline.
 */
export const SchemaMobileCoastlineResponse = SchemaDefaultMobileV1Return.extend({
    data: Vts.optional(SchemaMobileCoastlineData),
}, {
    description: 'Response of POST /mobile/coastline.',
});

/**
 * Type of schema MobileCoastlineResponse
 */
export type MobileCoastlineResponse = ExtractSchemaResultType<typeof SchemaMobileCoastlineResponse>;