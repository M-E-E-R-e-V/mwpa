import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * One IP currently blocked by the rate limiter. Mirrors the server-side
 * `BlacklistEntry` schema; types stay in this client wrapper so the frontend
 * bundle doesn't pull in the schemas package.
 */
export type BlacklistEntry = {
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

export type BlacklistListResponse = DefaultReturn & {
    list?: BlacklistEntry[];
};

export type BlacklistUnblockResponse = DefaultReturn & {
    success?: boolean;
};

/**
 * Blacklist API client — admin-only view of the IPs the rate limiter is
 * currently blocking, plus the unblock action.
 */
export class Blacklist {

    /**
     * The IPs currently blocked by the rate limiter.
     * @return {Promise<BlacklistEntry[]>}
     */
    public static async getList(): Promise<BlacklistEntry[]> {
        const result = await NetFetch.postData('/json/blacklist/list', {});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return (result as BlacklistListResponse).list ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

    /**
     * Unblock (reset the rate limiter for) an IP.
     * @param {string} ip
     * @return {Promise<boolean>} true when the limiter key was reset
     */
    public static async unblock(ip: string): Promise<boolean> {
        const result = await NetFetch.postData('/json/blacklist/unblock', {ip: ip});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return (result as BlacklistUnblockResponse).success ?? false;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return false;
    }

}
