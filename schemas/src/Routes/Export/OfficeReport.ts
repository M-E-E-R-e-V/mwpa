import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of OfficeReportFilter
 */
export const SchemaOfficeReportFilter = Vts.object({
    external_receiver_id: Vts.number(),
    year: Vts.optional(Vts.number({description: 'Restrict the export to sightings whose date falls within this calendar year. Omit for all years.'})),
    vehicle_id: Vts.optional(Vts.number({description: 'Restrict the export to one vehicle (boat). Required by AROC: 1 file per boat per semester. Omit to include all boats.'})),
    semester: Vts.optional(Vts.number({description: 'Half-year filter: 1 = Jan–Jun, 2 = Jul–Dec. Combine with year. Omit for the full year.'})),
    organization_id: Vts.optional(Vts.number({description: 'Restrict the export to sightings belonging to this organization. Combine with vehicle_id to scope further. Omit to include all organizations the caller has access to.'})),
}, {
    description: '',
});

/**
 * Type of schema OfficeReportFilter
 */
export type OfficeReportFilter = ExtractSchemaResultType<typeof SchemaOfficeReportFilter>;

/**
 * Schema of ExternalReceiverEntry
 * One row of the external_receiver table — used by the AROC-report receiver picker.
 */
export const SchemaExternalReceiverEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
}, {
    description: 'One row of the external_receiver table — used by the AROC-report receiver picker.',
});

/**
 * Type of schema ExternalReceiverEntry
 */
export type ExternalReceiverEntry = ExtractSchemaResultType<typeof SchemaExternalReceiverEntry>;

/**
 * Schema of ExternalReceiverListResponse
 * Response of GET /json/officereport/receivers — used to fill the receiver dropdown.
 */
export const SchemaExternalReceiverListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaExternalReceiverEntry)),
}, {
    description: 'Response of GET /json/officereport/receivers — used to fill the receiver dropdown.',
});

/**
 * Type of schema ExternalReceiverListResponse
 */
export type ExternalReceiverListResponse = ExtractSchemaResultType<typeof SchemaExternalReceiverListResponse>;