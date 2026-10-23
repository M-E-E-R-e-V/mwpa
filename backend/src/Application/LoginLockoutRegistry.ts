import {UserAgentInfo} from './UserAgentInfo.js';

/**
 * One login-lockout record: how many consecutive failed mobile-login attempts
 * a (email, device) pair has accrued, when, and — once the threshold is hit —
 * until when it is locked out. Timestamps are epoch ms. The `key` is the opaque
 * handle the admin UI sends back to unlock.
 */
export type LoginLockoutEntry = {
    key: string;
    email: string;
    device: string;
    count: number;
    first_attempt: number;
    last_attempt: number;
    locked_until: number;
    user_agent: string;
    browser: string;
    os: string;
};

/**
 * In-memory lockout for mobile credential endpoints. The figtree rate limiter
 * caps brute force per IP; this adds a per-(account, device) failed-attempt
 * lockout so a short mobile PIN can't be guessed from one device even within
 * the IP budget. Keyed by `email|deviceIdentity` so a wrong guess only locks
 * that device — an attacker can't lock a victim's account globally without
 * their device identity.
 *
 * In-memory by design (mirrors {@link RateLimitRegistry}): a restart clears
 * locks, which only the server operator can trigger, not the attacker. The
 * admin "Sperrliste" view reads {@link list}.
 */
export class LoginLockoutRegistry {

    /**
     * Singleton instance.
     * @protected
     */
    protected static _instance: LoginLockoutRegistry | null = null;

    /**
     * Get the singleton.
     * @return {LoginLockoutRegistry}
     */
    public static getInstance(): LoginLockoutRegistry {
        if (LoginLockoutRegistry._instance === null) {
            LoginLockoutRegistry._instance = new LoginLockoutRegistry();
        }

        return LoginLockoutRegistry._instance;
    }

    /**
     * Consecutive failures within WINDOW_MS that trigger a lockout.
     */
    public static readonly MAX_FAILURES = 5;

    /**
     * Sliding window the failure counter is measured over.
     */
    public static readonly WINDOW_MS = 15 * 60 * 1000;

    /**
     * How long a (email, device) stays locked once the threshold is hit.
     */
    public static readonly LOCK_MS = 15 * 60 * 1000;

    /**
     * Lockout records keyed by `email|device`.
     * @protected
     */
    protected readonly _entries = new Map<string, LoginLockoutEntry>();

    /**
     * Build the internal key for a (email, device) pair.
     * @param {string} email
     * @param {string} device
     * @return {string}
     * @protected
     */
    protected static _key(email: string, device: string): string {
        return `${email.trim().toLowerCase()}|${device}`;
    }

    /**
     * Is this (email, device) currently locked out?
     * @param {string} email
     * @param {string} device
     * @return {boolean}
     */
    public isLocked(email: string, device: string): boolean {
        const entry = this._entries.get(LoginLockoutRegistry._key(email, device));
        return entry !== undefined && entry.locked_until > Date.now();
    }

    /**
     * Milliseconds remaining on the lock, or 0 when not locked.
     * @param {string} email
     * @param {string} device
     * @return {number}
     */
    public lockRemainingMs(email: string, device: string): number {
        const entry = this._entries.get(LoginLockoutRegistry._key(email, device));
        if (entry === undefined) {
            return 0;
        }
        return Math.max(0, entry.locked_until - Date.now());
    }

    /**
     * Record one failed attempt. The counter resets when the previous attempt
     * is older than WINDOW_MS; once MAX_FAILURES is reached within the window
     * the pair is locked for LOCK_MS.
     * @param {string} email
     * @param {string} device
     * @param {string} userAgent
     */
    public recordFailure(email: string, device: string, userAgent: string): void {
        const now = Date.now();
        const key = LoginLockoutRegistry._key(email, device);
        const parsed = UserAgentInfo.parse(userAgent);
        const entry = this._entries.get(key);

        if (entry === undefined || (now - entry.last_attempt) > LoginLockoutRegistry.WINDOW_MS) {
            const created: LoginLockoutEntry = {
                key: key,
                email: email.trim(),
                device: device,
                count: 1,
                first_attempt: now,
                last_attempt: now,
                locked_until: 0,
                user_agent: userAgent,
                browser: parsed.browser,
                os: parsed.os
            };
            this._entries.set(key, created);
            return;
        }

        entry.count++;
        entry.last_attempt = now;

        if (userAgent.length > 0) {
            entry.user_agent = userAgent;
            entry.browser = parsed.browser;
            entry.os = parsed.os;
        }

        if (entry.count >= LoginLockoutRegistry.MAX_FAILURES) {
            entry.locked_until = now + LoginLockoutRegistry.LOCK_MS;
        }
    }

    /**
     * Clear the counter + lock after a successful login.
     * @param {string} email
     * @param {string} device
     */
    public reset(email: string, device: string): void {
        this._entries.delete(LoginLockoutRegistry._key(email, device));
    }

    /**
     * Currently-locked entries, newest lock first (stale ones pruned).
     * @return {LoginLockoutEntry[]}
     */
    public list(): LoginLockoutEntry[] {
        this._prune();

        return Array.from(this._entries.values())
        .filter((entry) => entry.locked_until > Date.now())
        .sort((a, b) => b.locked_until - a.locked_until);
    }

    /**
     * Lift a lockout by its key. Returns true when an entry was removed.
     * @param {string} key
     * @return {boolean}
     */
    public unlock(key: string): boolean {
        return this._entries.delete(key);
    }

    /**
     * Drop entries that are neither locked nor within the failure window.
     * @protected
     */
    protected _prune(): void {
        const now = Date.now();

        for (const [key, entry] of this._entries) {
            if (entry.locked_until <= now && (now - entry.last_attempt) > LoginLockoutRegistry.WINDOW_MS) {
                this._entries.delete(key);
            }
        }
    }

}