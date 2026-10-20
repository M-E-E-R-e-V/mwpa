import {promises as dnsPromises} from 'dns';
import {HttpServer} from '@stefanwerfling/figtree';
import {UserAgentInfo} from './UserAgentInfo.js';

/**
 * One blocked-IP record: how often and when the IP was last refused by the
 * rate limiter, the last path it was refused on, plus the client's browser
 * info (from the User-Agent) and a best-effort reverse-DNS hostname of the IP.
 * Timestamps are epoch ms. Note: the client's real machine name is not sent
 * over HTTP — `hostname` is the IP's PTR record (often the ISP name for a
 * NAT'd public IP, the real host for internal DNS).
 */
export type BlockedIpEntry = {
    ip: string;
    count: number;
    first_blocked: number;
    last_blocked: number;
    last_path: string;
    user_agent: string;
    browser: string;
    os: string;
    hostname: string;
};

/**
 * In-memory registry of IPs the rate limiter has blocked, fed by
 * {@link KavulaHttpServer._limiterHandler}. express-rate-limit's MemoryStore
 * does not enumerate its keys, so the admin "Blacklist" view needs this own
 * record. Entries older than the limiter window are pruned on read (after the
 * window the limiter has auto-released the IP anyway).
 */
export class RateLimitRegistry {

    /**
     * Singleton instance.
     * @protected
     */
    protected static _instance: RateLimitRegistry | null = null;

    /**
     * Get the singleton.
     * @return {RateLimitRegistry}
     */
    public static getInstance(): RateLimitRegistry {
        if (RateLimitRegistry._instance === null) {
            RateLimitRegistry._instance = new RateLimitRegistry();
        }

        return RateLimitRegistry._instance;
    }

    /**
     * Must match figtree's limiter `windowMs` (15 min) — entries older than
     * this are no longer blocked.
     */
    public static readonly WINDOW_MS = 15 * 60 * 1000;

    /**
     * The HTTP server, used to reset a limiter key on unblock.
     * @protected
     */
    protected _server: HttpServer | null = null;

    /**
     * Blocked IPs keyed by ip.
     * @protected
     */
    protected readonly _blocked = new Map<string, BlockedIpEntry>();

    /**
     * Register the HTTP server (so {@link unblock} can reset the limiter key).
     * @param {HttpServer} server
     */
    public setServer(server: HttpServer): void {
        this._server = server;
    }

    /**
     * Record one block for an IP (upsert), capturing the client's browser info
     * from the User-Agent. On the first sighting of an IP a best-effort
     * reverse-DNS lookup fills in the hostname asynchronously.
     * @param {string|undefined} ip
     * @param {string} path
     * @param {string} userAgent
     */
    public record(ip: string | undefined, path: string, userAgent: string): void {
        if (ip === undefined || ip === '') {
            return;
        }

        const now = Date.now();
        const entry = this._blocked.get(ip);
        const parsed = UserAgentInfo.parse(userAgent);

        if (entry === undefined) {
            const created: BlockedIpEntry = {
                ip: ip,
                count: 1,
                first_blocked: now,
                last_blocked: now,
                last_path: path,
                user_agent: userAgent,
                browser: parsed.browser,
                os: parsed.os,
                hostname: ''
            };

            this._blocked.set(ip, created);
            this._resolveHostname(created);

            return;
        }

        entry.count++;
        entry.last_blocked = now;
        entry.last_path = path;

        // Keep the latest non-empty User-Agent.
        if (userAgent.length > 0) {
            entry.user_agent = userAgent;
            entry.browser = parsed.browser;
            entry.os = parsed.os;
        }
    }

    /**
     * Best-effort reverse-DNS: fill the entry's hostname when a PTR exists.
     * Fire-and-forget so it never delays the limiter's hot path.
     * @param {BlockedIpEntry} entry
     * @protected
     */
    protected _resolveHostname(entry: BlockedIpEntry): void {
        dnsPromises.reverse(entry.ip).then((names) => {
            if (names.length > 0) {
                entry.hostname = names[0];
            }
        }).catch(() => {
            // No PTR record — leave hostname empty.
        });
    }

    /**
     * The currently blocked IPs, newest block first (stale ones pruned).
     * @return {BlockedIpEntry[]}
     */
    public list(): BlockedIpEntry[] {
        this._prune();

        return Array.from(this._blocked.values()).sort((a, b) => b.last_blocked - a.last_blocked);
    }

    /**
     * Unblock an IP: drop it from the registry and reset its limiter key.
     * @param {string} ip
     * @return {boolean} true when the limiter key was reset
     */
    public unblock(ip: string): boolean {
        this._blocked.delete(ip);

        if (this._server !== null) {
            return this._server.resetLimiterIP(ip);
        }

        return false;
    }

    /**
     * Drop entries whose last block is older than the limiter window.
     * @protected
     */
    protected _prune(): void {
        const cutoff = Date.now() - RateLimitRegistry.WINDOW_MS;

        for (const [ip, entry] of this._blocked) {
            if (entry.last_blocked < cutoff) {
                this._blocked.delete(ip);
            }
        }
    }

}