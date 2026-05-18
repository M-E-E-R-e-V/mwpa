import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

/*
 * These mirror `ServiceInfoEntry` from `figtree-schemas`. The frontend
 * doesn't depend on figtree-schemas (only mwpa_schemas), so the small
 * shape is duplicated here. The endpoint and the schema both live on
 * figtree's side — keep this in sync on any figtree bump.
 */

export type ServiceInfoScheduler = {
    status: 'none' | 'progress' | 'success' | 'error';
    inProcess: boolean;
    lastRun: string | null;
    cron: string;
};

export type ServiceInfoEntry = {
    type: '0' | '1';
    name: string;
    status: 'none' | 'progress' | 'success' | 'error';
    statusMsg: string;
    importance: '0' | '1' | '2';
    inProcess: boolean;
    dependencies: string[];
    scheduler?: ServiceInfoScheduler;
};

export type ServiceStatusResponse = {
    statusCode: string;
    msg?: string;
    services?: ServiceInfoEntry[];
};

/**
 * Wrapper around figtree's built-in /json/v1/service/* endpoints —
 * exposes the running ServiceManager state and lets admins start,
 * stop and ad-hoc invoke any registered service.
 */
export class Service {

    public static async getStatus(): Promise<ServiceInfoEntry[]> {
        const result = await NetFetch.getData('/json/v1/service/status');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as ServiceStatusResponse).services) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

    public static async invoke(name: string): Promise<boolean> {
        const result = await NetFetch.postData('/json/v1/service/invoke', {name});
        return Service._isOk(result);
    }

    public static async start(name: string): Promise<boolean> {
        const result = await NetFetch.postData('/json/v1/service/start', {name});
        return Service._isOk(result);
    }

    public static async stop(name: string): Promise<boolean> {
        const result = await NetFetch.postData('/json/v1/service/stop', {name});
        return Service._isOk(result);
    }

    private static _isOk(result: {statusCode?: string; msg?: string} | null): boolean {
        if (!result || !result.statusCode) {
            return false;
        }
        switch (result.statusCode) {
            case StatusCodes.OK:
                return true;
            case StatusCodes.UNAUTHORIZED:
                throw new UnauthorizedError();
            default:
                if (result.msg) {
                    throw new Error(result.msg);
                }
                return false;
        }
    }

}
