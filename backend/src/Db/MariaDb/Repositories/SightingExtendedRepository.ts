import {DBRepositoryUnid} from 'figtree';
import {DeepPartial, In} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';
import {SightingExtended} from '../Entities/SightingExtended.js';

/**
 * Patch shape for {@link SightingExtendedRepository.upsertBySighting} —
 * any subset of the structured columns. The method preserves whatever
 * isn't passed in, so DepthService can patch the depth_* columns while
 * leaving the weather_* columns untouched and vice versa.
 */
export type SightingExtendedPatch = DeepPartial<SightingExtended>;

/**
 * SightingExtended repository.
 *
 * Logically 1:1 with {@link Sighting} (one row per sighting_id) — the
 * one-time {@link TruncateSightingExtendedSetup} hook plus the
 * `upsertBySighting` flow keep that invariant. There is no DB-level
 * UNIQUE constraint on sighting_id (synchronize=true would fail to add
 * one if the table was ever to drift) — the upsert checks for the
 * existing row instead.
 */
export class SightingExtendedRepository extends DBRepositoryUnid<SightingExtended> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_extended';

    /**
     * Retrun a instance
     * @return {SightingExtendedRepository}
     */
    public static getInstance(): SightingExtendedRepository {
        return super.getSingleInstance(SightingExtended);
    }

    /**
     * Find metadata rows for many sightings in one round-trip. Used by
     * the Excel exporter so it can build a single Map<sightingId, ext>
     * for the entire result set instead of N+1 queries.
     * Returns an empty array when sightingIds is empty.
     */
    public async findManyBySightings(sightingIds: number[]): Promise<SightingExtended[]> {
        if (sightingIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        return repository.find({
            where: {
                sighting_id: In(sightingIds)
            }
        });
    }

    /**
     * Find the metadata row for a single sighting, or null if none yet.
     */
    public async findOneBySighting(sightingId: number): Promise<SightingExtended | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                sighting_id: sightingId
            }
        });
    }

    /**
     * Patch the metadata row for a sighting. Only the columns present
     * in `patch` are written; everything else stays as it was. Creates
     * the row if it doesn't exist yet.
     */
    public async upsertBySighting(sightingId: number, patch: SightingExtendedPatch): Promise<SightingExtended> {
        const repository = await this._repository;
        const existing = await repository.findOne({
            where: {
                sighting_id: sightingId
            }
        });

        if (existing) {
            Object.assign(existing, patch);
            return repository.save(existing);
        }

        const row = repository.create({
            sighting_id: sightingId,
            ...patch
        });

        return repository.save(row);
    }

    /**
     * Up to `limit` non-deleted sightings whose `depth_last_update` is
     * NULL or older than `cutoff`. Uses a LEFT JOIN so sightings
     * without any sighting_extended row at all are picked up too.
     */
    public async findStaleForDepth(cutoff: Date, limit: number): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.manager.createQueryBuilder(Sighting, 's')
        .leftJoin(SightingExtended, 'e', 'e.sighting_id = s.id')
        .where('s.deleted = :deleted', {deleted: false})
        .andWhere('s.location_begin <> \'\'')
        .andWhere('(e.depth_last_update IS NULL OR e.depth_last_update < :cutoff)', {cutoff: cutoff})
        .limit(limit)
        .getMany();
    }

    /**
     * Up to `limit` non-deleted sightings whose `weather_last_update`
     * is NULL or older than `cutoff`. Filters out sightings without a
     * date too (WeatherService needs one to query the upstream).
     */
    public async findStaleForWeather(cutoff: Date, limit: number): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.manager.createQueryBuilder(Sighting, 's')
        .leftJoin(SightingExtended, 'e', 'e.sighting_id = s.id')
        .where('s.deleted = :deleted', {deleted: false})
        .andWhere('s.location_begin <> \'\'')
        .andWhere('s.date <> \'\'')
        .andWhere('(e.weather_last_update IS NULL OR e.weather_last_update < :cutoff)', {cutoff: cutoff})
        .limit(limit)
        .getMany();
    }

    /**
     * Up to `limit` non-deleted sightings whose `ocean_last_update`
     * is NULL or older than `cutoff`. Filters out sightings without a
     * date too (OceanService needs one to query the upstream).
     */
    public async findStaleForOcean(cutoff: Date, limit: number): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.manager.createQueryBuilder(Sighting, 's')
        .leftJoin(SightingExtended, 'e', 'e.sighting_id = s.id')
        .where('s.deleted = :deleted', {deleted: false})
        .andWhere('s.location_begin <> \'\'')
        .andWhere('s.date <> \'\'')
        .andWhere('(e.ocean_last_update IS NULL OR e.ocean_last_update < :cutoff)', {cutoff: cutoff})
        .limit(limit)
        .getMany();
    }

}