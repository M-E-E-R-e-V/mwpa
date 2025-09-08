import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree';

/**
 * Schema of BehaviouralStateEntry
 */
export const SchemaBehaviouralStateEntry = Vts.object({
    id: Vts.number({description: 'Id of behavioural state'}),
    name: Vts.string({description: 'Behavioural state name'}),
    description: Vts.string({description: 'Behavioural state description'}),
    isdeleted: Vts.boolean({description: 'If the behavior tag is marked as deleted, you can only view it but no longer use it.'}),
}, {
    description: '',
});

/**
 * Type of schema BehaviouralStateEntry
 */
export type BehaviouralStateEntry = ExtractSchemaResultType<typeof SchemaBehaviouralStateEntry>;

/**
 * Schema of BehaviouralStatesResponse
 */
export const SchemaBehaviouralStatesResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaBehaviouralStateEntry),
}, {
    description: '',
});

/**
 * Type of schema BehaviouralStatesResponse
 */
export type BehaviouralStatesResponse = ExtractSchemaResultType<typeof SchemaBehaviouralStatesResponse>;