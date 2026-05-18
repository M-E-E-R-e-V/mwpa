import {DBRepositoryUnid} from 'figtree';
import {DeepPartial, In} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';
import {SightingFishingEffort} from '../Entities/SightingFishingEffort.js';

/**
 * Patch shape for {@link SightingFishingEffortRepository.upsertBySighting}
 * — any subset of the structured columns.
 */
export type SightingFishingEffortPatch = DeepPartial<SightingFishingEffort>;

/**
 * SightingFishingEffort repository.
 *
 * Logically 1:1 with {@link Sighting} (one row per sighting_id) —
 * the upsert flow keeps that invariant. There is no DB-level UNIQUE
 * constraint on sighting_id (mirrors SightingExtendedRepository for
 * consistency).
 */
export class SightingFishingEffortRepository extends DBRepositoryUnid<SightingFishingEffort> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_fishing_effort';

    /**
     * Return an instance
     */
    public static getInstance(): SightingFishingEffortRepository {
        return super.getSingleInstance(SightingFishingEffort);
    }

    /**
     * Find rows for many sightings in one round-trip. Returns [] when
     * sightingIds is empty.
     */
    public async findManyBySightings(sightingIds: number[]): Promise<SightingFishingEffort[]> {
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
     * Find the row for a single sighting, or null if none yet.
     */
    public async findOneBySighting(sightingId: number): Promise<SightingFishingEffort | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                sighting_id: sightingId
            }
        });
    }

    /**
     * Patch the row for a sighting. Only the columns present in
     * `patch` are written; everything else stays as it was. Creates
     * the row if it doesn't exist yet.
     */
    public async upsertBySighting(sightingId: number, patch: SightingFishingEffortPatch): Promise<SightingFishingEffort> {
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
     * Up to `limit` non-deleted sightings whose `fishing_last_update`
     * is NULL or older than `cutoff`. Filters out sightings without a
     * date too (FishingEffortService needs one to query the upstream).
     */
    public async findStaleForFishing(cutoff: Date, limit: number): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.manager.createQueryBuilder(Sighting, 's')
        .leftJoin(SightingFishingEffort, 'f', 'f.sighting_id = s.id')
        .where('s.deleted = :deleted', {deleted: false})
        .andWhere('s.location_begin <> \'\'')
        .andWhere('s.date <> \'\'')
        .andWhere('(f.fishing_last_update IS NULL OR f.fishing_last_update < :cutoff)', {cutoff: cutoff})
        .limit(limit)
        .getMany();
    }

}