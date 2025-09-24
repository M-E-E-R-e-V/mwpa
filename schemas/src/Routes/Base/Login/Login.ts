import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema of LoginIsLoginResponse
 */
export const SchemaLoginIsLoginResponse = Vts.object({
    status: Vts.boolean(),
}, {
    description: '',
});

/**
 * Type of schema LoginIsLoginResponse
 */
export type LoginIsLoginResponse = ExtractSchemaResultType<typeof SchemaLoginIsLoginResponse>;

/**
 * Schema of LogoutResponse
 */
export const SchemaLogoutResponse = Vts.object({
    success: Vts.boolean(),
}, {
    description: '',
});

/**
 * Type of schema LogoutResponse
 */
export type LogoutResponse = ExtractSchemaResultType<typeof SchemaLogoutResponse>;

/**
 * Schema of LoginResponse
 */
export const SchemaLoginResponse = Vts.object({
    success: Vts.boolean(),
    error: Vts.or([Vts.string(), Vts.null()]),
}, {
    description: '',
});

/**
 * Type of schema LoginResponse
 */
export type LoginResponse = ExtractSchemaResultType<typeof SchemaLoginResponse>;

/**
 * Schema of LoginRequest
 */
export const SchemaLoginRequest = Vts.object({
    email: Vts.string(),
    password: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema LoginRequest
 */
export type LoginRequest = ExtractSchemaResultType<typeof SchemaLoginRequest>;