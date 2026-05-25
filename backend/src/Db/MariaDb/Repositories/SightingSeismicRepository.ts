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

    /**
     * Raw correlation rows for the species profile's seismic exposure
     * card. Joins through `sighting` to filter by species_id, period
     * and org scope. Returns one row per correlation (a sighting can
     * appear multiple times if it sits inside the window of several
     * earthquakes).
     */
    public async findForSpecies(
        speciesId: number,
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Array<{sighting_id: number; distance_km: number; hours_offset: number; magnitude: number;}>> {
        if (organizationIds !== undefined && organizationIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('ss')
            .select('ss.sighting_id', 'sighting_id')
            .addSelect('ss.distance_km', 'distance_km')
            .addSelect('ss.hours_offset', 'hours_offset')
            .addSelect('ss.magnitude', 'magnitude')
            .innerJoin('sighting', 's', 's.id = ss.sighting_id')
            .where('s.species_id = :sid', {sid: speciesId})
            .andWhere('s.deleted = :del', {del: false});

        const from = (periodFrom ?? '').trim();
        const to = (periodTo ?? '').trim();
        if (from !== '') {
            qb.andWhere('s.date >= :from', {from});
        }
        if (to !== '') {
            qb.andWhere('s.date <= :to', {to});
        }
        if (organizationIds !== undefined) {
            qb.innerJoin('vehicle', 'v', 'v.id = s.vehicle_id')
                .andWhere('v.organization_id IN (:...orgIds)', {orgIds: organizationIds});
        }

        const rows = await qb.getRawMany<{
            sighting_id: number | string;
            distance_km: number | string;
            hours_offset: number | string;
            magnitude: number | string;
        }>();
        return rows.map((r) => ({
            sighting_id: Number(r.sighting_id),
            distance_km: Number(r.distance_km),
            hours_offset: Number(r.hours_offset),
            magnitude: Number(r.magnitude)
        }));
    }

}