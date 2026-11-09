import {Logger} from '@stefanwerfling/figtree';
import {StatusCodes} from 'figtree-schemas';
import {ProtectedAreaData, ProtectedAreaResponse} from 'mwpa_schemas';
import {CoastBbox, CoastlineGeometry} from '../../../Application/CoastlineGeometry.js';
import {ProtectedAreaCache} from '../../../Db/MariaDb/Entities/ProtectedAreaCache.js';
import {TrackingAreaType} from '../../../Db/MariaDb/Entities/OrganizationTrackingArea.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {OrganizationTrackingAreaRepository} from '../../../Db/MariaDb/Repositories/OrganizationTrackingAreaRepository.js';
import {ProtectedAreaCacheRepository} from '../../../Db/MariaDb/Repositories/ProtectedAreaCacheRepository.js';
import {Natura2000Sites} from '../../../Service/ProtectedArea/Natura2000Sites.js';
import {MobileV1StatusCode} from '../../Mobile/MobileV1.js';
import {HomeArea} from '../../Mobile/TrackingArea/HomeArea.js';

/**
 * ProtectedAreaList - /json/protectedarea/list: Natura 2000 sites around the
 * home area of the user's organization (+ 60 km; without home area around
 * the organization's position) for the sighting map.
 *
 * Same flow as the coast lines: a missing or old area is loaded from the
 * EEA service in the background, the answer is "pending" until it is there.
 */
export class ProtectedAreaList {

    /**
     * Sites older than this are loaded again (the dataset is yearly).
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

    /**
     * Organization whose region is shown: the main organization, else the
     * first other organization of the user, for admins without organization
     * the first one with a home area (or at least a position).
     * @param {number} mainOrganizationId
     * @param {number[]} organizations
     * @param {boolean} isAdmin
     * @return {number} 0 when none
     */
    public static async organizationOf(mainOrganizationId: number, organizations: number[], isAdmin: boolean): Promise<number> {
        if (mainOrganizationId > 0) {
            return mainOrganizationId;
        }

        const other = organizations.find((id) => id > 0);

        if (other !== undefined) {
            return other;
        }

        if (!isAdmin) {
            return 0;
        }

        const homeAreas = await (await OrganizationTrackingAreaRepository.getInstance().getRepository()).find({
            where: {area_type: TrackingAreaType.HOME},
            order: {organization_id: 'ASC'}
        });
        const withHome = homeAreas.find((area) => area.organization_id > 0);

        if (withHome) {
            return withHome.organization_id;
        }

        const orgs = await (await OrganizationRepository.getInstance().getRepository()).find({order: {id: 'ASC'}});
        const withPosition = orgs.find((org) => (parseFloat(org.lat) || 0) !== 0 || (parseFloat(org.lon) || 0) !== 0);

        return withPosition?.id ?? 0;
    }

    public static async get(organizationId: number): Promise<ProtectedAreaResponse> {
        const area = await ProtectedAreaList.areaOf(organizationId);

        if (area === null) {
            return {
                statusCode: StatusCodes.OK,
                data: ProtectedAreaList._data('no_area', '')
            };
        }

        if (!CoastlineGeometry.isLoadable(area.bbox)) {
            return {
                statusCode: StatusCodes.OK,
                msg: 'Area too large for protected areas.',
                data: ProtectedAreaList._data('error', area.key)
            };
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const row = await ProtectedAreaCacheRepository.getInstance().findByKey(area.key);
        const hasData = row !== null && row.fetch_datetime > 0 && row.geojson !== null;
        const fresh = hasData && nowSec - row.fetch_datetime < ProtectedAreaList.REFRESH_SEC;
        const waitAfterError = row !== null && row.error !== '' &&
            nowSec - row.attempt_datetime < ProtectedAreaList.RETRY_SEC;

        if (!fresh && !waitAfterError && !ProtectedAreaList._loading.has(area.key)) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ProtectedAreaList.load(area.key, area.bbox);
        }

        if (hasData) {
            return {
                statusCode: StatusCodes.OK,
                data: {
                    ...ProtectedAreaList._data('ok', area.key),
                    fetch_datetime: row.fetch_datetime,
                    feature_count: row.feature_count,
                    source: row.source,
                    geojson: row.geojson!
                }
            };
        }

        return {
            statusCode: StatusCodes.OK,
            data: ProtectedAreaList._data(waitAfterError ? 'error' : 'pending', area.key)
        };
    }

    /**
     * Home area of the organization + 60 km, else its position + 60 km.
     * @param {number} organizationId
     * @return {{key: string; bbox: CoastBbox}|null}
     */
    public static async areaOf(organizationId: number): Promise<{key: string; bbox: CoastBbox} | null> {
        if (organizationId <= 0) {
            return null;
        }

        let bbox: CoastBbox | null = null;
        const home = await HomeArea.getHomeArea(organizationId);

        if (home.statusCode === MobileV1StatusCode.OK && home.data) {
            bbox = CoastlineGeometry.bboxOfRing(home.data.coordinates, CoastlineGeometry.MARGIN_M);
        }

        if (bbox === null) {
            const org = await OrganizationRepository.getInstance().findOne(organizationId);
            const lat = parseFloat(org?.lat ?? '');
            const lon = parseFloat(org?.lon ?? '');

            if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
                bbox = CoastlineGeometry.expand({south: lat, west: lon, north: lat, east: lon}, CoastlineGeometry.MARGIN_M);
            }
        }

        if (bbox === null) {
            return null;
        }

        return {
            key: `org:${organizationId}:${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
            bbox
        };
    }

    /**
     * Load the sites of an area and store them; keeps the old ones when the
     * load fails.
     * @param {string} areaKey
     * @param {CoastBbox} bbox
     */
    public static async load(areaKey: string, bbox: CoastBbox): Promise<void> {
        ProtectedAreaList._loading.add(areaKey);

        const repo = ProtectedAreaCacheRepository.getInstance();

        try {
            let row = await repo.findByKey(areaKey);

            if (row === null) {
                row = new ProtectedAreaCache();
                row.area_key = areaKey;
                row.south = bbox.south;
                row.west = bbox.west;
                row.north = bbox.north;
                row.east = bbox.east;
                row.status = 'pending';
                row.geojson = null;
                row.feature_count = 0;
                row.source = '';
                row.error = '';
                row.fetch_datetime = 0;
            }

            row.attempt_datetime = Math.floor(Date.now() / 1000);
            row = await repo.save(row);

            try {
                const started = Date.now();
                const collection = await Natura2000Sites.fetch(bbox);
                const geojson = JSON.stringify(collection);

                row.geojson = geojson;
                row.feature_count = collection.features.length;
                row.source = Natura2000Sites.SOURCE;
                row.status = 'ok';
                row.error = '';
                row.fetch_datetime = Math.floor(Date.now() / 1000);
                await repo.save(row);

                Logger.getLogger().info(
                    `ProtectedArea: ${areaKey} loaded, ${collection.features.length} sites, ${geojson.length} bytes in ${Date.now() - started} ms`
                );
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);

                // old sites stay usable
                row.status = row.fetch_datetime > 0 ? 'ok' : 'error';
                row.error = msg.substring(0, 255);
                await repo.save(row);

                Logger.getLogger().warn(`ProtectedArea: ${areaKey} load failed: ${msg}`);
            }
        } catch (e) {
            Logger.getLogger().error(`ProtectedArea: ${areaKey}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            ProtectedAreaList._loading.delete(areaKey);
        }
    }

    /**
     * Answer without sites.
     * @param {string} status
     * @param {string} areaKey
     * @return {ProtectedAreaData}
     * @private
     */
    private static _data(status: string, areaKey: string): ProtectedAreaData {
        return {
            status,
            area_key: areaKey,
            fetch_datetime: 0,
            feature_count: 0,
            source: Natura2000Sites.SOURCE
        };
    }

}