import {DBRepositoryUnid} from '@stefanwerfling/figtree';
import {DeepPartial, In} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';
import {SightingEnrichment} from '../Entities/SightingEnrichment.js';
import {SightingOld} from '../Entities/SightingOld.js';

/**
 * Patch shape for {@link SightingEnrichmentRepository.upsertBySightingUnid}
 * — any subset of the structured columns.
 */
export type SightingEnrichmentPatch = DeepPartial<SightingEnrichment>;

/**
 * A sighting that needs (re)enrichment, drawn from EITHER the live `sighting`
 * table or the historical `sighting_old` table. Only the fields the
 * EnrichmentService reads are projected; `isOld` flags the source so the
 * service skips the numeric-id reuse-sample lookup (`sighting_extended` is
 * keyed by the live sighting id, which overlaps the independent sighting_old
 * id space and would false-match).
 */
export interface EnrichmentCandidate {
    id: number;
    unid: string;
    location_begin: string | null;
    date: string;
    duration_from: string;
    isOld: boolean;
}

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
     *
     * Reserves `oldReserve` of the `limit` slots for the historical
     * `sighting_old` table so old rows make steady progress even while the
     * live backlog is large; the live `sighting` table gets the rest. Each
     * side absorbs the other's unused budget — a short live backlog lets old
     * take the slack (and once live is empty old gets the whole budget),
     * while live is only capped once the (far larger) old backlog drains.
     * Same unid-join and staleness filter on both sides.
     */
    public async findStale(cutoff: Date, limit: number, oldReserve: number): Promise<EnrichmentCandidate[]> {
        const repository = await this._repository;
        const manager = repository.manager;

        const liveLimit = Math.max(0, limit - oldReserve);

        const live = liveLimit === 0 ? [] : await manager.createQueryBuilder(Sighting, 's')
        .leftJoin(SightingEnrichment, 'e', 'e.sighting_unid = s.unid')
        .where('s.deleted = :deleted', {deleted: false})
        .andWhere('s.unid <> \'\'')
        .andWhere('s.location_begin <> \'\'')
        .andWhere('s.date <> \'\'')
        .andWhere('(e.enrichment_last_update IS NULL OR e.enrichment_last_update < :cutoff)', {cutoff: cutoff})
        .limit(liveLimit)
        .getMany();

        const candidates: EnrichmentCandidate[] = live.map((s) => ({
            id: s.id,
            unid: s.unid,
            location_begin: s.location_begin,
            date: s.date,
            duration_from: s.duration_from,
            isOld: false
        }));

        const remaining = limit - candidates.length;

        if (remaining <= 0) {
            return candidates;
        }

        const old = await manager.createQueryBuilder(SightingOld, 'o')
        .leftJoin(SightingEnrichment, 'e', 'e.sighting_unid = o.unid')
        .where('o.deleted = :deleted', {deleted: false})
        .andWhere('o.unid <> \'\'')
        .andWhere('o.location_begin <> \'\'')
        .andWhere('o.date <> \'\'')
        .andWhere('(e.enrichment_last_update IS NULL OR e.enrichment_last_update < :cutoff)', {cutoff: cutoff})
        .limit(remaining)
        .getMany();

        for (const o of old) {
            candidates.push({
                id: o.id,
                unid: o.unid,
                location_begin: o.location_begin,
                date: o.date,
                duration_from: o.duration_from,
                isOld: true
            });
        }

        return candidates;
    }

}