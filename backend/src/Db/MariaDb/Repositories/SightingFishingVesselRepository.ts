import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {SightingFishingVessel} from '../Entities/SightingFishingVessel.js';

/**
 * Pure-data shape for a single vessel row, used by the bulk replace
 * entry-point so the service doesn't have to construct entity objects
 * by hand.
 */
export type SightingFishingVesselRow = {
    vessel_id: string;
    name?: string;
    mmsi?: string;
    flag?: string;
    gear_type?: string;
    hours: number;
};

/**
 * SightingFishingVessel repository.
 *
 * Single mutation entry-point: `replaceBySighting` — delete every
 * existing row for the sighting and write the new set in one go.
 * GFW's per-vessel list can shrink between reanalysis runs (a vessel
 * that was previously attributed to the buffer drops out), and merge
 * semantics would leave stale rows around.
 */
export class SightingFishingVesselRepository extends DBRepository<SightingFishingVessel> {

    public static REGISTER_NAME = 'sighting_fishing_vessel';

    public static getInstance(): SightingFishingVesselRepository {
        return super.getSingleInstance(SightingFishingVessel);
    }

    public async findBySighting(sightingId: number): Promise<SightingFishingVessel[]> {
        const repo = await this._repository;
        return repo.find({
            where: {sighting_id: sightingId},
            order: {hours: 'DESC'}
        });
    }

    public async findManyBySightings(sightingIds: number[]): Promise<SightingFishingVessel[]> {
        if (sightingIds.length === 0) {
            return [];
        }
        const repo = await this._repository;
        return repo.find({
            where: {sighting_id: In(sightingIds)},
            order: {hours: 'DESC'}
        });
    }

    /**
     * Drop every existing detail row for the sighting and write the
     * new set. Atomic enough for our needs — a concurrent reader
     * during the brief window will just see fewer rows.
     */
    public async replaceBySighting(
        sightingId: number,
        rows: SightingFishingVesselRow[],
        nowUnixSec: number
    ): Promise<void> {
        const repo = await this._repository;
        await repo.delete({sighting_id: sightingId});

        if (rows.length === 0) {
            return;
        }

        const entities = rows.map((r) => repo.create({
            sighting_id: sightingId,
            vessel_id: r.vessel_id,
            name: r.name ?? '',
            mmsi: r.mmsi ?? '',
            flag: r.flag ?? '',
            gear_type: r.gear_type ?? '',
            hours: r.hours,
            last_updated_at: nowUnixSec
        }));

        await repo.save(entities);
    }

}