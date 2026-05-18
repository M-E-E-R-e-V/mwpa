import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {TourAisVessel} from '../Entities/TourAisVessel.js';

export type TourAisVesselInsert = {
    tour_id: number;
    mmsi: string;
    vessel_name: string;
    flag: string;
    ship_type: number | null;
    n_pings: number;
    closest_distance_m: number;
    closest_at: number;
    avg_sog: number | null;
    course_changed: boolean;
};

/**
 * TourAisVessel repository.
 *
 * Like SightingFishingVessel: the AisTourMatchService uses a wipe +
 * rewrite per tour so a re-attribution run (admin re-trigger via the
 * Services page) leaves no stale rows from the previous attempt.
 */
export class TourAisVesselRepository extends DBRepository<TourAisVessel> {

    public static REGISTER_NAME = 'tour_ais_vessel';

    public static getInstance(): TourAisVesselRepository {
        return super.getSingleInstance(TourAisVessel);
    }

    public async findByTour(tourId: number): Promise<TourAisVessel[]> {
        const repo = await this._repository;
        return repo.find({
            where: {tour_id: tourId},
            order: {closest_distance_m: 'ASC'}
        });
    }

    public async findManyByTours(tourIds: number[]): Promise<TourAisVessel[]> {
        if (tourIds.length === 0) {
            return [];
        }
        const repo = await this._repository;
        return repo.find({
            where: {tour_id: In(tourIds)},
            order: {closest_distance_m: 'ASC'}
        });
    }

    public async replaceByTour(
        tourId: number,
        rows: TourAisVesselInsert[],
        nowUnixSec: number
    ): Promise<void> {
        const repo = await this._repository;
        await repo.delete({tour_id: tourId});
        if (rows.length === 0) {
            return;
        }
        const entities = rows.map((r) => repo.create({...r, created_at: nowUnixSec}));
        await repo.save(entities);
    }

}