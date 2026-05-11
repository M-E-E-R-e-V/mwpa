import {Router} from 'express';
import {DefaultRoute, Logger} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    MovementConfigEntry,
    MovementConfigResponse,
    SchemaMovementConfigEntry,
    SchemaMovementConfigResponse,
    SchemaMWPASessionData,
    SchemaSightingMovementListRequest,
    SchemaSightingMovementListResponse,
    SightingMovementEntry,
    SightingMovementListResponse,
    SightingMovementTrackEntry
} from 'mwpa_schemas';
import {SightingMovementRepository} from '../../Db/MariaDb/Repositories/SightingMovementRepository.js';
import {SightingMovementTrackRepository} from '../../Db/MariaDb/Repositories/SightingMovementTrackRepository.js';
import {SightingMovementService} from '../../Service/Movement/SightingMovementService.js';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';

/**
 * SightingMovement admin routes.
 *
 * Phase 1 only ships the bulk rebuild — config read/write + a stats
 * endpoint will come once the admin UI lands.
 */
export class SightingMovement extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._post(
            '/json/sighting/movement/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SightingMovementListResponse> => {
                const body = data.body;
                const ids = (body?.sighting_ids ?? []).filter(
                    (n) => Number.isFinite(n) && n > 0
                );

                if (ids.length === 0) {
                    return {statusCode: StatusCodes.OK, list: []};
                }

                const movements = await SightingMovementRepository.getInstance().findManyBySightings(ids);

                if (movements.length === 0) {
                    return {statusCode: StatusCodes.OK, list: []};
                }

                // Pull every segment in one round-trip via the raw repo —
                // findByMovement loops would be N+1.
                const trackRepoRaw = await SightingMovementTrackRepository.getInstance().getRepository();
                const movementIds = movements.map((m) => m.id);
                const segments = await trackRepoRaw
                    .createQueryBuilder('t')
                    .where('t.sighting_movement_id IN (:...ids)', {ids: movementIds})
                    .orderBy('t.sighting_movement_id', 'ASC')
                    .addOrderBy('t.sequence_no', 'ASC')
                    .getMany();

                const segmentsByMovement = new Map<number, SightingMovementTrackEntry[]>();
                for (const s of segments) {
                    let bucket = segmentsByMovement.get(s.sighting_movement_id);
                    if (!bucket) {
                        bucket = [];
                        segmentsByMovement.set(s.sighting_movement_id, bucket);
                    }
                    bucket.push({
                        sequence_no: s.sequence_no,
                        start_lat: s.start_lat,
                        start_lon: s.start_lon,
                        end_lat: s.end_lat,
                        end_lon: s.end_lon,
                        start_dt: s.start_dt,
                        end_dt: s.end_dt,
                        distance_m: s.distance_m,
                        duration_s: s.duration_s,
                        speed_mps: s.speed_mps ?? undefined,
                        heading_deg: s.heading_deg ?? undefined,
                        turning_angle_deg: s.turning_angle_deg ?? undefined,
                        quality: s.quality
                    });
                }

                const list: SightingMovementEntry[] = movements.map((m) => ({
                    sighting_id: m.sighting_id,
                    source: m.source,
                    segment_count: m.segment_count,
                    total_distance_m: m.total_distance_m,
                    total_duration_s: m.total_duration_s,
                    avg_speed_mps: m.avg_speed_mps ?? undefined,
                    max_speed_mps: m.max_speed_mps ?? undefined,
                    dominant_heading_deg: m.dominant_heading_deg ?? undefined,
                    heading_variance_deg: m.heading_variance_deg ?? undefined,
                    bbox_min_lat: m.bbox_min_lat ?? undefined,
                    bbox_min_lon: m.bbox_min_lon ?? undefined,
                    bbox_max_lat: m.bbox_max_lat ?? undefined,
                    bbox_max_lon: m.bbox_max_lon ?? undefined,
                    first_dt: m.first_dt,
                    last_dt: m.last_dt,
                    computed_at: m.computed_at,
                    tracks: segmentsByMovement.get(m.id) ?? []
                }));

                return {statusCode: StatusCodes.OK, list};
            },
            {
                description: 'Bulk-fetch movement data (header + segments) for a set of sighting ids. Missing / uncomputed ids are omitted; empty list returns empty response.',
                bodySchema: SchemaSightingMovementListRequest,
                responseBodySchema: SchemaSightingMovementListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/sighting/movement/rebuild_all',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }

                Logger.getLogger().info('SightingMovement::rebuild_all: starting');

                const stats = await SightingMovementService.getInstance().rebuildAll(
                    (done, total) => {
                        // Coarse progress — every ~500 sightings the chunk
                        // loop emits a log line so an admin tailing the
                        // backend log can watch progress without polling.
                        if (done % 500 === 0) {
                            Logger.getLogger().info(
                                `SightingMovement::rebuild_all: ${done}/${total} processed`
                            );
                        }
                    }
                );

                Logger.getLogger().info(
                    `SightingMovement::rebuild_all: done. processed=${stats.processed} failed=${stats.failed} skipped=${stats.skipped}`
                );

                return {
                    statusCode: StatusCodes.OK,
                    msg: `processed=${stats.processed} failed=${stats.failed} skipped=${stats.skipped}`
                };
            },
            {
                description: 'Rebuild SightingMovement + SightingMovementTrack for every non-deleted sighting (admin only). State-changing despite GET because the admin triggers it from the browser; idempotent, so safe to call repeatedly. Synchronous — large datasets may take a while; check the backend log for progress.',
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/sighting/movement/config',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<MovementConfigResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN};
                }

                const config = await SightingMovementService.getInstance().getConfigReader().get();
                return {statusCode: StatusCodes.OK, config};
            },
            {
                description: 'Read the persisted MovementConfig (admin only). Returns the effective values — defaults filled in for any missing key in the settings row.',
                responseBodySchema: SchemaMovementConfigResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/sighting/movement/config',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<MovementConfigResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN};
                }

                const body = data.body as MovementConfigEntry | undefined;
                if (!body) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request body missing'};
                }

                try {
                    await SightingMovementService.getInstance().getConfigReader().save(body);
                } catch (e) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: `Config rejected: ${(e as Error).message}`
                    };
                }

                const config = await SightingMovementService.getInstance().getConfigReader().get();
                return {statusCode: StatusCodes.OK, config};
            },
            {
                description: 'Persist MovementConfig (admin only). Validates lead/trail/outlier are non-negative numbers and default_local_tz is an IANA zone; returns the saved values on success.',
                bodySchema: SchemaMovementConfigEntry,
                responseBodySchema: SchemaMovementConfigResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}