import {DefaultReturn} from 'figtree-schemas';

/**
 * Numeric status codes for Mobile-V1 responses. Mirrors figtree-schemas StatusCodes
 * but as plain numbers, because the production Dart client (`mwpa-app`,
 * `lib/Mwpa/Models/StatusCodes.dart`) reads `statusCode` as `int`.
 */
export const MobileV1StatusCode = {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INTERNAL_ERROR: 500
} as const;

/**
 * Convert a legacy figtree-DefaultReturn-shaped response (with `statusCode`
 * as the figtree string-enum) into a Mobile-V1 response (with `statusCode`
 * as a number). Used by `Mobile/Reuse` when it delegates to Main handlers.
 *
 * @param {T} res
 * @return {Omit<T, 'statusCode'> & {statusCode: number}}
 */
export function toV1<T extends DefaultReturn>(
    res: T
): Omit<T, 'statusCode'> & {statusCode: number} {
    const status = typeof res.statusCode === 'number'
        ? res.statusCode
        : parseInt(res.statusCode, 10);
    return {
        ...res,
        statusCode: status
    };
}