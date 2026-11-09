import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of ProtectedAreaData
 * Natura 2000 sites around the home area of the organization (EEA, loaded in the background and cached).
 */
export const SchemaProtectedAreaData = Vts.object({
    status: Vts.string({description: '\'ok\', \'pending\' (loading), \'error\' or \'no_area\'.'}),
    area_key: Vts.string(),
    fetch_datetime: Vts.number({description: 'Seconds-epoch of the last successful load, 0 if none yet.'}),
    feature_count: Vts.number(),
    source: Vts.string({description: 'Data source / version, e.g. \'EEA Natura 2000 (2024)\'.'}),
    geojson: Vts.optional(Vts.string({description: 'GeoJSON FeatureCollection (EPSG:4326) as string; properties code, name, site_type (A=SPA, B=SCI/SAC, C=both), area_km2, url.'})),
}, {
    description: 'Natura 2000 sites around the home area of the organization (EEA, loaded in the background and cached).',
});

/**
 * Type of schema ProtectedAreaData
 */
export type ProtectedAreaData = ExtractSchemaResultType<typeof SchemaProtectedAreaData>;

/**
 * Schema of ProtectedAreaResponse
 * Response of /json/protectedarea/list.
 */
export const SchemaProtectedAreaResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaProtectedAreaData),
}, {
    description: 'Response of /json/protectedarea/list.',
});

/**
 * Type of schema ProtectedAreaResponse
 */
export type ProtectedAreaResponse = ExtractSchemaResultType<typeof SchemaProtectedAreaResponse>;