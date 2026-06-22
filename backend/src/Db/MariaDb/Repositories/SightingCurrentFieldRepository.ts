import {DBRepositoryUnid} from 'figtree';
import {DeepPartial, In} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';
import {SightingCurrentField} from '../Entities/SightingCurrentField.js';

/**
 * Patch shape for {@link SightingCurrentFieldRepository.upsertBySighting}
 * — any subset of the columns. The repository overwrites the row in
 * place (one regional patch per sighting), so a partial patch only
 * makes sense for callers that read-modify-write.
 */
export type SightingCurrentFieldPatch = DeepPartial<SightingCurrentField>;

/**
 * Regional-current-field repository. Logically 1:1 with `Sighting`
 * (one patch per sighting), enforced by the upsert flow rather than a
 * DB-level UNIQUE constraint to mirror the {@link SightingExtended}
 * pattern.
 */
export class SightingCurrentFieldRepository extends DBRepositoryUnid<SightingCurrentField> {

    /**
     * Register name.
     */
    public static REGISTER_NAME = 'sighting_current_field';

    /**
     * Return the singleton instance.
     */
    public static getInstance(): SightingCurrentFieldRepository {
        return super.getSingleInstance(SightingCurrentField);
    }

    /**
     * The regional patch for a single sighting, or null if none yet.
     */
    public async findOneBySighting(sightingId: number): Promise<SightingCurrentField | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                sighting_id: sightingId
            }
        });
    }

    /**
     * Bulk lookup used by the regional-currents map layer that wants to
     * draw vectors for many sightings in one render pass.
     * Empty input returns an empty array (no SQL hit).
     */
    public async findManyBySightings(sightingIds: number[]): Promise<SightingCurrentField[]> {
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
     * Write (or overwrite) the regional patch for a sighting. Always
     * full-row — the regional patch is a single physical observation,
     * not a partial enrichment, so partial patches are not exposed.
     */
    public async upsertBySighting(sightingId: number, patch: SightingCurrentFieldPatch): Promise<SightingCurrentField> {
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
     * Up to `limit` non-deleted, sea-located, dated sightings whose
     * regional-current patch is missing or older than `cutoff`. Used
     * by the CurrentFieldService cron to drain backfill in temporal
     * order (oldest sighting first).
     *
     * `earliestDate` gates rows whose `date` is older than the wired
     * dataset's coverage so we don't keep retrying historical
     * sightings that no CMEMS layer can answer.
     */
    public async findStaleForField(cutoff: Date, limit: number, earliestDate: string): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.manager.createQueryBuilder(Sighting, 's')
            .leftJoin(SightingCurrentField, 'c', 'c.sighting_id = s.id')
            .where('s.deleted = :deleted', {deleted: false})
            .andWhere('s.location_begin <> \'\'')
            .andWhere('s.date <> \'\'')
            .andWhere('s.date >= :earliest', {earliest: earliestDate})
            .andWhere('(c.fetched_at IS NULL OR c.fetched_at < :cutoff)', {cutoff: cutoff})
            .orderBy('s.date', 'ASC')
            .limit(limit)
            .getMany();
    }

}