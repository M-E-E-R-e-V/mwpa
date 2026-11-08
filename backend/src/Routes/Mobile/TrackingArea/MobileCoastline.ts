import {Logger} from '@stefanwerfling/figtree';
import {MobileCoastlineData, MobileCoastlineRequest, MobileCoastlineResponse} from 'mwpa_schemas';
import {CoastBbox, CoastlineGeometry} from '../../../Application/CoastlineGeometry.js';
import {CoastlineCache} from '../../../Db/MariaDb/Entities/CoastlineCache.js';
import {CoastlineCacheRepository} from '../../../Db/MariaDb/Repositories/CoastlineCacheRepository.js';
import {OverpassCoastline} from '../../../Service/Coastline/OverpassCoastline.js';
import {MobileV1StatusCode} from '../MobileV1.js';
import {HomeArea} from './HomeArea.js';

/**
 * MobileCoastline - POST /mobile/coastline: coast lines around the home
 * area of the organization (or the cell of the device position without home
 * area) for the distance to the coast in the app.
 *
 * Loading from Overpass takes up to minutes, longer than a mobile request
 * may wait: a missing or old area is loaded in the background and the
 * answer is "pending" until it is there; the app asks again with its next
 * sync and keeps the lines offline.
 */
export class MobileCoastline {

    /**
     * Lines older than this are loaded again (coast lines rarely change).
     */
    public static readonly REFRESH_SEC = 90 * 24 * 60 * 60;

    /**
     * Wait after a failed load before the next attempt.
     */
    public static readonly RETRY_SEC = 6 * 60 * 60;

    /**
     * Areas being loaded by this process.
     */
    private static readonly _loading = new Set<string>();

    public static async get(
        mainOrganizationId: number,
        body: MobileCoastlineRequest | undefined
    ): Promise<MobileCoastlineResponse> {
        const area = await MobileCoastline.areaOf(mainOrganizationId, body);

        if (area === null) {
            return {
                statusCode: MobileV1StatusCode.OK,
                data: MobileCoastline.data('no_area', '', {south: 0, west: 0, north: 0, east: 0})
            };
        }

        if (!CoastlineGeometry.isLoadable(area.bbox)) {
            return {
                statusCode: MobileV1StatusCode.OK,
                msg: 'Area too large for coast lines.',
                data: MobileCoastline.data('error', area.key, area.bbox)
            };
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const row = await CoastlineCacheRepository.getInstance().findByKey(area.key);
        const hasLines = row !== null && row.fetch_datetime > 0 && row.lines !== null;
        const fresh = hasLines && nowSec - row.fetch_datetime < MobileCoastline.REFRESH_SEC;
        const waitAfterError = row !== null && row.error !== '' &&
            nowSec - row.attempt_datetime < MobileCoastline.RETRY_SEC;

        if (!fresh && !waitAfterError && !MobileCoastline._loading.has(area.key)) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            MobileCoastline.load(area.key, area.bbox);
        }

        if (hasLines) {
            let lines: number[][] = [];

            try {
                lines = JSON.parse(row.lines!) as number[][];
            } catch {
                return {
                    statusCode: MobileV1StatusCode.OK,
                    data: MobileCoastline.data('error', area.key, area.bbox)
                };
            }

            return {
                statusCode: MobileV1StatusCode.OK,
                data: {
                    ...MobileCoastline.data('ok', area.key, area.bbox),
                    lines: lines,
                    fetch_datetime: row.fetch_datetime
                }
            };
        }

        return {
            statusCode: MobileV1StatusCode.OK,
            data: MobileCoastline.data(waitAfterError ? 'error' : 'pending', area.key, area.bbox)
        };
    }

    /**
     * Home area of the organization, else the cell of the device position.
     */
    public static async areaOf(
        mainOrganizationId: number,
        body: MobileCoastlineRequest | undefined
    ): Promise<{key: string; bbox: CoastBbox} | null> {
        if (mainOrganizationId > 0) {
            const home = await HomeArea.getHomeArea(mainOrganizationId);

            if (home.statusCode === MobileV1StatusCode.OK && home.data) {
                const bbox = CoastlineGeometry.bboxOfRing(home.data.coordinates, CoastlineGeometry.MARGIN_M);

                if (bbox !== null) {
                    return {
                        key: `org:${mainOrganizationId}:${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
                        bbox: bbox
                    };
                }
            }
        }

        if (body && body.latitude !== undefined && body.longitude !== undefined) {
            return CoastlineGeometry.cellOf(body.latitude, body.longitude, CoastlineGeometry.MARGIN_M);
        }

        return null;
    }

    /**
     * Load the lines of an area from Overpass and store them; keeps the old
     * lines when the load fails.
     */
    public static async load(areaKey: string, bbox: CoastBbox): Promise<void> {
        MobileCoastline._loading.add(areaKey);

        const repo = CoastlineCacheRepository.getInstance();

        try {
            let row = await repo.findByKey(areaKey);

            if (row === null) {
                row = new CoastlineCache();
                row.area_key = areaKey;
                row.south = bbox.south;
                row.west = bbox.west;
                row.north = bbox.north;
                row.east = bbox.east;
                row.status = 'pending';
                row.lines = null;
                row.point_count = 0;
                row.error = '';
                row.fetch_datetime = 0;
            }

            row.attempt_datetime = Math.floor(Date.now() / 1000);
            row = await repo.save(row);

            try {
                const started = Date.now();
                const ways = await OverpassCoastline.fetchWays(bbox);
                const lines = CoastlineGeometry.toLines(ways, bbox, CoastlineGeometry.TOLERANCE_M);
                const points = lines.reduce((sum, l) => sum + (l.length / 2), 0);

                row.lines = JSON.stringify(lines);
                row.point_count = points;
                row.status = 'ok';
                row.error = '';
                row.fetch_datetime = Math.floor(Date.now() / 1000);
                await repo.save(row);

                Logger.getLogger().info(
                    `Coastline: ${areaKey} loaded, ${lines.length} lines, ${points} points in ${Date.now() - started} ms`
                );
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);

                // old lines stay usable
                row.status = row.fetch_datetime > 0 ? 'ok' : 'error';
                row.error = msg.substring(0, 255);
                await repo.save(row);

                Logger.getLogger().warn(`Coastline: ${areaKey} load failed: ${msg}`);
            }
        } catch (e) {
            Logger.getLogger().error(`Coastline: ${areaKey}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            MobileCoastline._loading.delete(areaKey);
        }
    }

    private static data(status: string, areaKey: string, bbox: CoastBbox): MobileCoastlineData {
        return {
            status: status,
            area_key: areaKey,
            south: bbox.south,
            west: bbox.west,
            north: bbox.north,
            east: bbox.east,
            fetch_datetime: 0
        };
    }

}
