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