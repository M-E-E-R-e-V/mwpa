import {DBRepositoryUnid} from '@stefanwerfling/figtree';
import {DeepPartial, In} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';
import {SightingEnrichment} from '../Entities/SightingEnrichment.js';

/**
 * Patch shape for {@link SightingEnrichmentRepository.upsertBySightingUnid}
 * — any subset of the structured columns.
 */
export type SightingEnrichmentPatch = DeepPartial<SightingEnrichment>;

/**
 * SightingEnrichment repository.
 *
 * Logically 1:1 with {@link Sighting}, keyed by the sighting's stable
 * `unid` string (not its numeric id — the original sighting table is never
 * touched and new tables reference it by unid). The upsert flow keeps the
 * 1:1 invariant; there is no DB-level UNIQUE constraint (mirrors the other
 * derived repositories for consistency).
 */
export class SightingEnrichmentRepository extends DBRepositoryUnid<SightingEnrichment> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_enrichment';

    /**
     * Return an instance
     */
    public static getInstance(): SightingEnrichmentRepository {
        return super.getSingleInstance(SightingEnrichment);
    }

    /**
     * Find rows for many sightings (by unid) in one round-trip. Returns []
     * when `sightingUnids` is empty.
     */
    public async findManyBySightingUnids(sightingUnids: string[]): Promise<SightingEnrichment[]> {
        if (sightingUnids.length === 0) {
            return [];
        }

        const repository = await this._repository;
        return repository.find({
            where: {
                sighting_unid: In(sightingUnids)
            }
        });
    }

    /**
     * Find the row for a single sighting (by unid), or null if none yet.
     */
    public async findOneBySightingUnid(sightingUnid: string): Promise<SightingEnrichment | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                sighting_unid: sightingUnid
            }
        });
    }

    /**
     * Patch the row for a sighting (by unid). Only the columns present in
     * `patch` are written; everything else stays as it was. Creates the row
     * if it doesn't exist yet.
     */
    public async upsertBySightingUnid(
        sightingUnid: string,
        patch: SightingEnrichmentPatch
    ): Promise<SightingEnrichment> {
        const repository = await this._repository;
        const existing = await repository.findOne({
            where: {
                sighting_unid: sightingUnid
            }
        });

        if (existing) {
            Object.assign(existing, patch);
            return repository.save(existing);
        }

        const row = repository.create({
            sighting_unid: sightingUnid,
            ...patch
        });

        return repository.save(row);
    }

    /**
     * Up to `limit` non-deleted sightings whose enrichment row is missing
     * or whose `enrichment_last_update` is NULL or older than `cutoff`.
     * Joined on the sighting's `unid` (not id). Filters out sightings
     * without a position or date — every enricher needs both.
     */
    public async findStale(cutoff: Date, limit: number): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.manager.createQueryBuilder(Sighting, 's')
        .leftJoin(SightingEnrichment, 'e', 'e.sighting_unid = s.unid')
        .where('s.deleted = :deleted', {deleted: false})
        .andWhere('s.unid <> \'\'')
        .andWhere('s.location_begin <> \'\'')
        .andWhere('s.date <> \'\'')
        .andWhere('(e.enrichment_last_update IS NULL OR e.enrichment_last_update < :cutoff)', {cutoff: cutoff})
        .limit(limit)
        .getMany();
    }

}