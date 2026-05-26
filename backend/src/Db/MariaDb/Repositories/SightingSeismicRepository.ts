import {DBRepository} from 'figtree';
import {SightingSeismic} from '../Entities/SightingSeismic.js';

/**
 * Enriched (sighting × earthquake) row returned by
 * {@link SightingSeismicRepository.findImpactByEarthquakeIds}.
 *
 * Joined fields are flattened so the route handler can map straight
 * onto `EarthquakeImpactSighting` without a second lookup. `behaviours`
 * stays as the raw comma-separated id string — the handler resolves
 * names against a {@link BehaviouralStatesRepository} map.
 */
export type SightingSeismicImpactRow = {
    sighting_id: number;
    earthquake_id: number;
    distance_km: number;
    hours_offset: number;
    magnitude: number;
    date: string;
    tour_start: string;
    location_begin: string;
    species_id: number;
    species_name: string;
    behaviours: string;
    encounter_id: number;
    encounter_name: string;
};

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

    /**
     * All (sighting × earthquake) correlations for the given earthquake
     * ids, narrowed to `|hours_offset| <= windowHoursAbs`. Joins sighting
     * + species + encounter_categories so the response can render
     * without per-row follow-up queries. Behaviour names are not joined
     * here — sighting.behaviours is a comma-separated id list, resolved
     * in the route handler against a behavioural_states map.
     */
    public async findImpactByEarthquakeIds(
        earthquakeIds: number[],
        windowHoursAbs: number
    ): Promise<SightingSeismicImpactRow[]> {
        if (earthquakeIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const rows = await repository.createQueryBuilder('ss')
            .select('ss.sighting_id', 'sighting_id')
            .addSelect('ss.earthquake_id', 'earthquake_id')
            .addSelect('ss.distance_km', 'distance_km')
            .addSelect('ss.hours_offset', 'hours_offset')
            .addSelect('ss.magnitude', 'magnitude')
            .addSelect('s.date', 'date')
            .addSelect('s.tour_start', 'tour_start')
            .addSelect('s.location_begin', 'location_begin')
            .addSelect('s.species_id', 'species_id')
            .addSelect('sp.name', 'species_name')
            .addSelect('s.behaviours', 'behaviours')
            .addSelect('s.reaction_id', 'encounter_id')
            .addSelect('ec.name', 'encounter_name')
            .innerJoin('sighting', 's', 's.id = ss.sighting_id')
            .leftJoin('species', 'sp', 'sp.id = s.species_id')
            .leftJoin('encounter_categories', 'ec', 'ec.id = s.reaction_id')
            .where('ss.earthquake_id IN (:...eqIds)', {eqIds: earthquakeIds})
            .andWhere('ABS(ss.hours_offset) <= :wh', {wh: windowHoursAbs})
            .andWhere('s.deleted = :del', {del: false})
            .orderBy('ss.hours_offset', 'ASC')
            .getRawMany<{
                sighting_id: number | string;
                earthquake_id: number | string;
                distance_km: number | string;
                hours_offset: number | string;
                magnitude: number | string;
                date: string;
                tour_start: string;
                location_begin: string;
                species_id: number | string;
                species_name: string | null;
                behaviours: string | null;
                encounter_id: number | string | null;
                encounter_name: string | null;
            }>();

        return rows.map((r) => ({
            sighting_id: Number(r.sighting_id),
            earthquake_id: Number(r.earthquake_id),
            distance_km: Number(r.distance_km),
            hours_offset: Number(r.hours_offset),
            magnitude: Number(r.magnitude),
            date: r.date ?? '',
            tour_start: r.tour_start ?? '',
            location_begin: r.location_begin ?? '',
            species_id: Number(r.species_id),
            species_name: r.species_name ?? '',
            behaviours: r.behaviours ?? '',
            encounter_id: r.encounter_id === null ? 0 : Number(r.encounter_id),
            encounter_name: r.encounter_name ?? ''
        }));
    }

}