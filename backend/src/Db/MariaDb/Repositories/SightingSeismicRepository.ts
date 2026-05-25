import {DBRepository} from 'figtree';
import {SightingSeismic} from '../Entities/SightingSeismic.js';

/**
 * Repository for the `sighting_seismic` correlation table. Inserts go
 * through {@link upsertCorrelation} to keep the unique constraint
 * (sighting_id, earthquake_id) honest.
 */
export class SightingSeismicRepository extends DBRepository<SightingSeismic> {

    public static REGISTER_NAME = 'sighting_seismic';

    public static getInstance(): SightingSeismicRepository {
        return super.getSingleInstance(SightingSeismic);
    }

    /**
     * Insert-or-update a sighting × earthquake correlation. Returns
     * true when a row was actually written.
     */
    public async upsertCorrelation(
        sightingId: number,
        earthquakeId: number,
        distanceKm: number,
        hoursOffset: number,
        magnitude: number
    ): Promise<boolean> {
        const repository = await this._repository;
        const now = Math.floor(Date.now() / 1000);

        const existing = await repository.findOne({
            where: {sighting_id: sightingId, earthquake_id: earthquakeId}
        });

        if (!existing) {
            const row = repository.create({
                sighting_id: sightingId,
                earthquake_id: earthquakeId,
                distance_km: distanceKm,
                hours_offset: hoursOffset,
                magnitude: magnitude,
                create_datetime: now
            });
            await repository.save(row);
            return true;
        }

        if (existing.distance_km !== distanceKm ||
            existing.hours_offset !== hoursOffset ||
            existing.magnitude !== magnitude) {
            existing.distance_km = distanceKm;
            existing.hours_offset = hoursOffset;
            existing.magnitude = magnitude;
            await repository.save(existing);
            return true;
        }
        return false;
    }

    /**
     * Lookup all correlations for a sighting (used by the per-sighting
     * inspector / species-profile aggregation).
     */
    public async findBySighting(sightingId: number): Promise<SightingSeismic[]> {
        const repository = await this._repository;
        return repository.find({
            where: {sighting_id: sightingId},
            order: {hours_offset: 'ASC'}
        });
    }

}