import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema of OfficeReportFilter
 */
export const SchemaOfficeReportFilter = Vts.object({
    external_receiver_id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema OfficeReportFilter
 */
export type OfficeReportFilter = ExtractSchemaResultType<typeof SchemaOfficeReportFilter>;