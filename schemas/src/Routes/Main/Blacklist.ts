import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of BlacklistEntry
 * One IP currently blocked by the rate limiter.
 */
export const SchemaBlacklistEntry = Vts.object({
    ip: Vts.string(),
    count: Vts.number(),
    first_blocked: Vts.number({description: 'Epoch ms of the first block.'}),
    last_blocked: Vts.number({description: 'Epoch ms of the most recent block.'}),
    last_path: Vts.string({description: 'The last path the IP was refused on.'}),
    user_agent: Vts.string(),
    browser: Vts.string({description: 'Parsed browser label from the User-Agent.'}),
    os: Vts.string({description: 'Parsed OS label from the User-Agent.'}),
    hostname: Vts.string({description: 'Best-effort reverse-DNS (PTR) hostname of the IP.'}),
}, {
    description: 'One IP currently blocked by the rate limiter.',
});

/**
 * Type of schema BlacklistEntry
 */
export type BlacklistEntry = ExtractSchemaResultType<typeof SchemaBlacklistEntry>;

/**
 * Schema of BlacklistListResponse
 * Response of /json/blacklist/list — the IPs currently blocked by the rate limiter.
 */
export const SchemaBlacklistListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaBlacklistEntry)),
}, {
    description: 'Response of /json/blacklist/list — the IPs currently blocked by the rate limiter.',
});

/**
 * Type of schema BlacklistListResponse
 */
export type BlacklistListResponse = ExtractSchemaResultType<typeof SchemaBlacklistListResponse>;

/**
 * Schema of BlacklistUnblockRequest
 * Unblock (reset the rate limiter for) a single IP.
 */
export const SchemaBlacklistUnblockRequest = Vts.object({
    ip: Vts.string(),
}, {
    description: 'Unblock (reset the rate limiter for) a single IP.',
});

/**
 * Type of schema BlacklistUnblockRequest
 */
export type BlacklistUnblockRequest = ExtractSchemaResultType<typeof SchemaBlacklistUnblockRequest>;

/**
 * Schema of BlacklistUnblockResponse
 * Response of /json/blacklist/unblock.
 */
export const SchemaBlacklistUnblockResponse = SchemaDefaultReturn.extend({
    success: Vts.optional(Vts.boolean()),
}, {
    description: 'Response of /json/blacklist/unblock.',
});

/**
 * Type of schema BlacklistUnblockResponse
 */
export type BlacklistUnblockResponse = ExtractSchemaResultType<typeof SchemaBlacklistUnblockResponse>;

/**
 * Schema of LoginLockoutEntry
 * One (account, device) pair currently locked out after too many failed mobile logins.
 */
export const SchemaLoginLockoutEntry = Vts.object({
    key: Vts.string({description: 'Opaque handle the admin UI sends back to unlock.'}),
    email: Vts.string(),
    device: Vts.string({description: 'Device identity the attempts came from.'}),
    count: Vts.number({description: 'Consecutive failed attempts.'}),
    first_attempt: Vts.number({description: 'Epoch ms of the first failed attempt in the window.'}),
    last_attempt: Vts.number({description: 'Epoch ms of the most recent failed attempt.'}),
    locked_until: Vts.number({description: 'Epoch ms until which the pair is locked (0 = counting but not locked).'}),
    user_agent: Vts.string(),
    browser: Vts.string(),
    os: Vts.string(),
}, {
    description: 'One (account, device) pair currently locked out after too many failed mobile logins.',
});

/**
 * Type of schema LoginLockoutEntry
 */
export type LoginLockoutEntry = ExtractSchemaResultType<typeof SchemaLoginLockoutEntry>;

/**
 * Schema of LoginLockoutListResponse
 * Response of /json/login_lockout/list — accounts/devices currently locked out.
 */
export const SchemaLoginLockoutListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaLoginLockoutEntry)),
}, {
    description: 'Response of /json/login_lockout/list — accounts/devices currently locked out.',
});

/**
 * Type of schema LoginLockoutListResponse
 */
export type LoginLockoutListResponse = ExtractSchemaResultType<typeof SchemaLoginLockoutListResponse>;

/**
 * Schema of LoginLockoutUnblockRequest
 * Lift a login lockout by its key.
 */
export const SchemaLoginLockoutUnblockRequest = Vts.object({
    key: Vts.string(),
}, {
    description: 'Lift a login lockout by its key.',
});

/**
 * Type of schema LoginLockoutUnblockRequest
 */
export type LoginLockoutUnblockRequest = ExtractSchemaResultType<typeof SchemaLoginLockoutUnblockRequest>;

/**
 * Schema of LoginLockoutUnblockResponse
 * Response of /json/login_lockout/unblock.
 */
export const SchemaLoginLockoutUnblockResponse = SchemaDefaultReturn.extend({
    success: Vts.boolean(),
}, {
    description: 'Response of /json/login_lockout/unblock.',
});

/**
 * Type of schema LoginLockoutUnblockResponse
 */
export type LoginLockoutUnblockResponse = ExtractSchemaResultType<typeof SchemaLoginLockoutUnblockResponse>;