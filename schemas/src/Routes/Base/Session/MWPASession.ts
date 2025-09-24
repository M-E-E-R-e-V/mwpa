import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaSessionUserData, SchemaSessionData} from 'figtree';

/**
 * Schema of MWPASessionUserData
 */
export const SchemaMWPASessionUserData = SchemaSessionUserData.extend({
    isAdmin: Vts.boolean(),
    isMobileLogin: Vts.boolean(),
    userid: Vts.number(),
    deviceIdentity: Vts.optional(Vts.string({description: 'device identity is set by mobile login'})),
    main_group_id: Vts.number({description: 'main user group id'}),
    main_organization_id: Vts.number({description: 'main organization id'}),
    groups: Vts.array(Vts.number({description: 'a list with all group ids by user'})),
    organizations: Vts.array(Vts.number({description: 'a list with all organization ids by user'})),
}, {
    description: '',
});

/**
 * Type of schema MWPASessionUserData
 */
export type MWPASessionUserData = ExtractSchemaResultType<typeof SchemaMWPASessionUserData>;

/**
 * Schema of MWPASessionData
 */
export const SchemaMWPASessionData = SchemaSessionData.extend({
    user: SchemaMWPASessionUserData,
}, {
    description: '',
});

/**
 * Type of schema MWPASessionData
 */
export type MWPASessionData = ExtractSchemaResultType<typeof SchemaMWPASessionData>;