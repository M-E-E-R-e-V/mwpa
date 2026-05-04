import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema of DefaultMobileV1Return
 * Mobile-V1 base response: like figtree-schemas DefaultReturn, but statusCode is a number to match the production Dart client (mwpa-app StatusCodes.dart uses int).
 */
export const SchemaDefaultMobileV1Return = Vts.object({
    statusCode: Vts.number({description: 'HTTP-style status code as number (200, 401, 403, 500, ...).'}),
    msg: Vts.optional(Vts.string({description: 'Optional message, set on error responses.'})),
}, {
    description: 'Mobile-V1 base response: like figtree-schemas DefaultReturn, but statusCode is a number to match the production Dart client (mwpa-app StatusCodes.dart uses int).',
});

/**
 * Type of schema DefaultMobileV1Return
 */
export type DefaultMobileV1Return = ExtractSchemaResultType<typeof SchemaDefaultMobileV1Return>;