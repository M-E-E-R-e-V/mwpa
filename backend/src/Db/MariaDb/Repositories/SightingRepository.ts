import {DBRepository} from 'figtree';
import {Between, FindOptionsOrder, FindOptionsWhere, In, Like, Raw} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';

/**
 * Optional filter criteria for {@link SightingRepository.findActiveList}.
 * All fields are AND-combined; undefined fields are ignored.
 */
export type SightingFilterCriteria = {
    period_from?: string;
    period_to?: string;
    species_id?: number;
    organization_id?: number;
    vehicle_id?: number;
    vehicle_driver_id?: number;
    search?: string;
};

/**
 * Sighting repository
 */
export class SightingRepository extends DBRepository<Sighting> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting';

    /**
     * Retrun a instance
     * @return {SightingRepository}
     */
    public static getInstance(): SightingRepository {
        return super.getSingleInstance(Sighting);
    }

    /**
     * Count sightings linked to a species id.
     * @param {number} speciesId
     * @return {number}
     */
    public async countBySpecies(speciesId: number): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                species_id: speciesId
            }
        });
    }

    /**
     * Count sightings on a tour (by foreign tour_fid).
     * @param {string} tourFid
     * @return {number}
     */
    public async countByTourFid(tourFid: string): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                tour_fid: tourFid
            }
        });
    }

    /**
     * Bulk-count non-deleted sightings grouped by tour_fid for a set of
     * tour_fids. Returns a map keyed by tour_fid; tours with no
     * sightings are absent (caller treats as 0).
     *
     * Single GROUP BY query replaces N per-tour `countByTourFid` calls
     * in the Tours list endpoint.
     * @param {string[]} tourFids
     * @return {Map<string, number>}
     */
    public async countGroupedByTourFid(tourFids: string[]): Promise<Map<string, number>> {
        const result = new Map<string, number>();
        if (tourFids.length === 0) {
            return result;
        }
        const repository = await this._repository;
        const rows = await repository.createQueryBuilder('s')
            .select('s.tour_fid', 'tour_fid')
            .addSelect('COUNT(*)', 'cnt')
            .where({tour_fid: In(tourFids), deleted: false})
            .groupBy('s.tour_fid')
            .getRawMany<{tour_fid: string; cnt: string}>();
        for (const row of rows) {
            result.set(row.tour_fid, Number(row.cnt));
        }
        return result;
    }

    /**
     * Find all sightings on a tour (by foreign tour_fid).
     * @param {string} tourFid
     * @return {Sighting[]}
     */
    public async findByTourFid(tourFid: string): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                tour_fid: tourFid
            }
        });
    }

    /**
     * Find a sighting by its mobile-side unid.
     * @param {string} unid
     * @return {Sighting | null}
     */
    public async findByUnid(unid: string): Promise<Sighting | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {unid}
        });
    }

    /**
     * Find a sighting by its content hash (used for de-dupe on mobile sync).
     * @param {string} hash
     * @return {Sighting | null}
     */
    public async findByHash(hash: string): Promise<Sighting | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {hash}
        });
    }

    /**
     * Reassign all sightings from sourceSpeciesId to destinationSpeciesId.
     * @param {number} sourceSpeciesId
     * @param {number} destinationSpeciesId
     * @return {number} affected row count
     */
    public async reassignSpecies(sourceSpeciesId: number, destinationSpeciesId: number): Promise<number> {
        const repository = await this._repository;
        const result = await repository
            .createQueryBuilder()
            .update()
            .set({
                species_id: destinationSpeciesId
            })
            .where('species_id = :species_id', {species_id: sourceSpeciesId})
            .execute();

        return result.affected ?? 0;
    }

    /**
     * Distinct calendar years that appear in non-deleted sightings, ordered DESC.
     * Skips rows where the date column is empty or not parseable as YYYY-…
     * Used by the Excel-Report year picker.
     * @return {number[]}
     */
    public async findDistinctYears(): Promise<number[]> {
        const repository = await this._repository;
        const rows = await repository
            .createQueryBuilder('s')
            .select('DISTINCT YEAR(s.date)', 'year')
            .where('s.deleted = :deleted', {deleted: false})
            .andWhere('s.date <> :empty', {empty: ''})
            .andWhere('YEAR(s.date) IS NOT NULL')
            .orderBy('year', 'DESC')
            .getRawMany<{year: number | string | null}>();

        const years: number[] = [];

        for (const row of rows) {
            if (row.year === null || row.year === undefined) {
                continue;
            }

            const y = typeof row.year === 'number' ? row.year : Number(row.year);

            if (Number.isFinite(y) && y > 0) {
                years.push(y);
            }
        }

        return years;
    }

    /**
     * Distinct vehicle ids that appear on non-deleted sightings within the given
     * date range and (optional) organization. Used by the AROC-report boat picker
     * to narrow the dropdown to boats that actually have data for the selected
     * period — empty filters return every boat that has any sighting ever.
     *
     * Org filter joins through `vehicle.organization_id` rather than
     * `sighting.organization_id`: the sighting column is only populated by the
     * mobile-save path, so historical / main-web sightings carry 0 and would
     * never match an explicit org pick. The vehicle's own org column is
     * authoritative.
     * @param {string | undefined} periodFrom — inclusive lower bound (YYYY-MM-DD)
     * @param {string | undefined} periodTo — inclusive upper bound (YYYY-MM-DD)
     * @param {number | undefined} organizationId — when > 0, restrict to this org
     * @return {number[]}
     */
    public async findUsedVehicleIds(
        periodFrom?: string,
        periodTo?: string,
        organizationId?: number
    ): Promise<number[]> {
        const repository = await this._repository;
        const qb = repository
            .createQueryBuilder('s')
            .select('DISTINCT s.vehicle_id', 'vehicle_id')
            .where('s.deleted = :deleted', {deleted: false})
            .andWhere('s.vehicle_id > 0');

        if (periodFrom !== undefined && periodFrom !== '') {
            qb.andWhere('s.date >= :from', {from: periodFrom});
        }

        if (periodTo !== undefined && periodTo !== '') {
            qb.andWhere('s.date <= :to', {to: periodTo});
        }

        if (organizationId !== undefined && organizationId > 0) {
            qb.innerJoin('vehicle', 'v', 'v.id = s.vehicle_id')
                .andWhere('v.organization_id = :org', {org: organizationId});
        }

        const rows = await qb.getRawMany<{vehicle_id: number | string | null}>();

        const ids: number[] = [];

        for (const row of rows) {
            if (row.vehicle_id === null || row.vehicle_id === undefined) {
                continue;
            }

            const id = typeof row.vehicle_id === 'number' ? row.vehicle_id : Number(row.vehicle_id);

            if (Number.isFinite(id) && id > 0) {
                ids.push(id);
            }
        }

        return ids;
    }

    /**
     * Paginated list of non-deleted sightings, optionally restricted to a set of organization ids
     * and further narrowed by the user-provided filter criteria.
     *
     * Org scoping precedence: when both `organizationIds` (the caller's allow-list, set for
     * non-admins) and `filter.organization_id` (an explicit pick) are present, the explicit
     * pick must be inside the allow-list — otherwise the result is empty (no leak across orgs).
     *
     * @param {FindOptionsOrder<Sighting>} order
     * @param {number | undefined} skip
     * @param {number | undefined} take
     * @param {number[] | undefined} organizationIds — when set, restricts results to these orgs
     * @param {SightingFilterCriteria | undefined} filter — extra AND-combined criteria
     * @return {{rows: Sighting[]; count: number}}
     */
    public async findActiveList(
        order: FindOptionsOrder<Sighting>,
        skip?: number,
        take?: number,
        organizationIds?: number[],
        filter?: SightingFilterCriteria
    ): Promise<{rows: Sighting[]; count: number}> {
        const repository = await this._repository;
        const baseWhere: FindOptionsWhere<Sighting> = {
            deleted: false
        };

        if (organizationIds !== undefined) {
            if (organizationIds.length === 0) {
                return {rows: [], count: 0};
            }

            if (filter?.organization_id !== undefined) {
                if (!organizationIds.includes(filter.organization_id)) {
                    return {rows: [], count: 0};
                }

                baseWhere.organization_id = filter.organization_id;
            } else {
                baseWhere.organization_id = In(organizationIds);
            }
        } else if (filter?.organization_id !== undefined) {
            baseWhere.organization_id = filter.organization_id;
        }

        if (filter?.species_id !== undefined) {
            baseWhere.species_id = filter.species_id;
        }

        if (filter?.vehicle_id !== undefined) {
            baseWhere.vehicle_id = filter.vehicle_id;
        }

        if (filter?.vehicle_driver_id !== undefined) {
            baseWhere.vehicle_driver_id = filter.vehicle_driver_id;
        }

        const periodFrom = (filter?.period_from ?? '').trim();
        const periodTo = (filter?.period_to ?? '').trim();

        if (periodFrom !== '' && periodTo !== '') {
            baseWhere.date = Between(periodFrom, periodTo);
        } else if (periodFrom !== '') {
            baseWhere.date = Raw((alias) => `${alias} >= :from`, {from: periodFrom});
        } else if (periodTo !== '') {
            baseWhere.date = Raw((alias) => `${alias} <= :to`, {to: periodTo});
        }

        const search = (filter?.search ?? '').trim();

        // The free-text search is OR-ed across two text columns, so the combined
        // where becomes an array (TypeORM treats array-of-where as OR over rows
        // matching any branch). Each branch must repeat the AND criteria.
        let where: FindOptionsWhere<Sighting> | FindOptionsWhere<Sighting>[] = baseWhere;

        if (search !== '') {
            const like = Like(`%${search}%`);
            where = [
                {...baseWhere, note: like},
                {...baseWhere, recognizable_animals: like}
            ];
        }

        const [rows, count] = await repository.findAndCount({
            where,
            order,
            skip,
            take
        });

        return {rows, count};
    }

    /**
     * Project the sub-set of sighting columns the per-species profile needs,
     * joined with `sighting_extended` for the env metrics. The Profile route
     * histograms in JS — keeping the projection narrow keeps the row payload
     * small (only the columns we actually bucket on).
     *
     * Org scoping: when `organizationIds` is set, joins through
     * `vehicle.organization_id` (sighting.organization_id is only populated by
     * mobile-save and zero for legacy/web-created rows — see memory note).
     *
     * @param {number} speciesId
     * @param {string | undefined} periodFrom YYYY-MM-DD inclusive
     * @param {string | undefined} periodTo   YYYY-MM-DD inclusive
     * @param {number[] | undefined} organizationIds — when set (non-admins),
     *        restrict to sightings whose vehicle belongs to one of these orgs.
     *        Empty array → no rows.
     */
    public async findForSpeciesProfile(
        speciesId: number,
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Array<{
        id: number;
        date: string;
        tour_start: string;
        tour_fid: string;
        species_count: number;
        juveniles: number;
        calves: number;
        newborns: number;
        distance_coast: string;
        behaviours: string;
        reaction_id: number;
        location_begin: string;
        beaufort_wind: number;
        other_vehicle: string;
        depth_m: number | null;
        sst_c_day: number | null;
        chl_a_mg_m3_day: number | null;
        salinity_psu_day: number | null;
        sla_cm_day: number | null;
        current_speed_m_s_day: number | null;
        wave_height_m_day: number | null;
        uv_index_day: number | null;
        avg_speed_mps: number | null;
        max_speed_mps: number | null;
        total_distance_m: number | null;
        dominant_heading_deg: number | null;
        fishing_hours_day_25km: number | null;
    }>> {
        if (organizationIds !== undefined && organizationIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('s')
            .select('s.id', 'id')
            .addSelect('s.date', 'date')
            .addSelect('s.tour_start', 'tour_start')
            .addSelect('s.tour_fid', 'tour_fid')
            .addSelect('s.species_count', 'species_count')
            .addSelect('s.juveniles', 'juveniles')
            .addSelect('s.calves', 'calves')
            .addSelect('s.newborns', 'newborns')
            .addSelect('s.distance_coast', 'distance_coast')
            .addSelect('s.behaviours', 'behaviours')
            .addSelect('s.reaction_id', 'reaction_id')
            .addSelect('s.location_begin', 'location_begin')
            .addSelect('s.beaufort_wind', 'beaufort_wind')
            .addSelect('s.other_vehicle', 'other_vehicle')
            .addSelect('e.depth_m', 'depth_m')
            .addSelect('e.sst_c_day', 'sst_c_day')
            .addSelect('e.chl_a_mg_m3_day', 'chl_a_mg_m3_day')
            .addSelect('e.salinity_psu_day', 'salinity_psu_day')
            .addSelect('e.sla_cm_day', 'sla_cm_day')
            .addSelect('e.current_speed_m_s_day', 'current_speed_m_s_day')
            .addSelect('e.wave_height_m_day', 'wave_height_m_day')
            .addSelect('e.uv_index_day', 'uv_index_day')
            .addSelect('m.avg_speed_mps', 'avg_speed_mps')
            .addSelect('m.max_speed_mps', 'max_speed_mps')
            .addSelect('m.total_distance_m', 'total_distance_m')
            .addSelect('m.dominant_heading_deg', 'dominant_heading_deg')
            .addSelect('f.fishing_hours_day_25km', 'fishing_hours_day_25km')
            .leftJoin('sighting_extended', 'e', 'e.sighting_id = s.id')
            .leftJoin('sighting_movement', 'm', 'm.sighting_id = s.id')
            .leftJoin('sighting_fishing_effort', 'f', 'f.sighting_id = s.id')
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

        return qb.getRawMany();
    }

    /**
     * Year × Species sighting counts — one row per (species_id, year)
     * with the species' name and species_group color attached. Used by
     * the cross-species regression matrix for Year × SPUE.
     */
    public async aggregateYearlySpecies(
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Array<{species_id: number; species_name: string; color: string; y: string; sightings: number;}>> {
        if (organizationIds !== undefined && organizationIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('s')
            .select('s.species_id', 'species_id')
            .addSelect('sp.name', 'species_name')
            .addSelect('sg.color', 'color')
            .addSelect('DATE_FORMAT(s.date, \'%Y\')', 'y')
            .addSelect('COUNT(*)', 'sightings')
            .innerJoin('species', 'sp', 'sp.id = s.species_id')
            .leftJoin('species_group', 'sg', 'sg.id = sp.species_groupid')
            .where('s.deleted = :del', {del: false})
            .andWhere('s.species_id > 0');

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

        qb.groupBy('s.species_id')
            .addGroupBy('sp.name')
            .addGroupBy('sg.color')
            .addGroupBy('DATE_FORMAT(s.date, \'%Y\')');

        const rows = await qb.getRawMany<{species_id: number | string; species_name: string; color: string | null; y: string; sightings: number | string;}>();
        return rows.map((r) => ({
            species_id: Number(r.species_id),
            species_name: r.species_name,
            color: r.color ?? '#6c757d',
            y: r.y,
            sightings: Number(r.sightings)
        }));
    }

    /**
     * Oldest non-deleted sighting date (YYYY-MM-DD), or null when the
     * table is empty. Used by the seismic import flow to figure out how
     * far back to cold-start; without sightings there's nothing to
     * correlate against, so the caller skips the import entirely.
     */
    public async getOldestSightingDate(): Promise<string | null> {
        const repository = await this._repository;
        const row = await repository.createQueryBuilder('s')
            .select('MIN(s.date)', 'min_date')
            .where('s.deleted = :del', {del: false})
            .getRawOne<{min_date: string | null;}>();
        return row?.min_date ?? null;
    }

    /**
     * Minimal projection of sightings whose `date` falls inside the
     * supplied YYYY-MM-DD range — used by the seismic correlation flow
     * to find sightings near a freshly imported earthquake. Returns
     * `location_begin` as the raw JSON so the caller decides whether
     * to parse + Haversine-filter or not.
     */
    public async findInDateRange(
        dateFrom: string,
        dateTo: string
    ): Promise<Array<{
        id: number;
        date: string;
        tour_start: string;
        location_begin: string;
    }>> {
        const repository = await this._repository;
        const qb = repository.createQueryBuilder('s')
            .select('s.id', 'id')
            .addSelect('s.date', 'date')
            .addSelect('s.tour_start', 'tour_start')
            .addSelect('s.location_begin', 'location_begin')
            .where('s.deleted = :del', {del: false})
            .andWhere('s.date BETWEEN :from AND :to', {from: dateFrom, to: dateTo});
        return qb.getRawMany();
    }

    /**
     * Month × Species sighting counts — one row per (species_id, ym)
     * with name + group color. Pairs with the monthly tour-hours
     * aggregate to form the effort-saturation regression
     * (tour_hours × sightings).
     */
    public async aggregateMonthlySpecies(
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Array<{species_id: number; species_name: string; color: string; ym: string; sightings: number;}>> {
        if (organizationIds !== undefined && organizationIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('s')
            .select('s.species_id', 'species_id')
            .addSelect('sp.name', 'species_name')
            .addSelect('sg.color', 'color')
            .addSelect('DATE_FORMAT(s.date, \'%Y-%m\')', 'ym')
            .addSelect('COUNT(*)', 'sightings')
            .innerJoin('species', 'sp', 'sp.id = s.species_id')
            .leftJoin('species_group', 'sg', 'sg.id = sp.species_groupid')
            .where('s.deleted = :del', {del: false})
            .andWhere('s.species_id > 0');

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

        qb.groupBy('s.species_id')
            .addGroupBy('sp.name')
            .addGroupBy('sg.color')
            .addGroupBy('DATE_FORMAT(s.date, \'%Y-%m\')');

        const rows = await qb.getRawMany<{species_id: number | string; species_name: string; color: string | null; ym: string; sightings: number | string;}>();
        return rows.map((r) => ({
            species_id: Number(r.species_id),
            species_name: r.species_name,
            color: r.color ?? '#6c757d',
            ym: r.ym,
            sightings: Number(r.sightings)
        }));
    }

    /**
     * Per-sighting env scatter — every non-deleted sighting in the period
     * with its species + group color plus the env values needed for
     * regression. Drops rows with NULL species_count (defensive).
     */
    public async findEnvScatterRows(
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Array<{
        species_id: number;
        species_name: string;
        color: string;
        species_count: number;
        sst_c_day: number | null;
        chl_a_mg_m3_day: number | null;
    }>> {
        if (organizationIds !== undefined && organizationIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('s')
            .select('s.species_id', 'species_id')
            .addSelect('sp.name', 'species_name')
            .addSelect('sg.color', 'color')
            .addSelect('s.species_count', 'species_count')
            .addSelect('e.sst_c_day', 'sst_c_day')
            .addSelect('e.chl_a_mg_m3_day', 'chl_a_mg_m3_day')
            .innerJoin('species', 'sp', 'sp.id = s.species_id')
            .leftJoin('species_group', 'sg', 'sg.id = sp.species_groupid')
            .leftJoin('sighting_extended', 'e', 'e.sighting_id = s.id')
            .where('s.deleted = :del', {del: false})
            .andWhere('s.species_id > 0')
            .andWhere('s.species_count > 0');

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
            species_id: number | string;
            species_name: string;
            color: string | null;
            species_count: number | string;
            sst_c_day: number | null;
            chl_a_mg_m3_day: number | null;
        }>();
        return rows.map((r) => ({
            species_id: Number(r.species_id),
            species_name: r.species_name,
            color: r.color ?? '#6c757d',
            species_count: Number(r.species_count),
            sst_c_day: r.sst_c_day !== null ? Number(r.sst_c_day) : null,
            chl_a_mg_m3_day: r.chl_a_mg_m3_day !== null ? Number(r.chl_a_mg_m3_day) : null
        }));
    }

    /**
     * Find other species seen on the same tours (same `tour_fid`) as a
     * given species, restricted to the supplied period and org scope.
     * Returns label (species name) + count of distinct tour_fids where
     * both species co-occurred.
     *
     * The query joins back to `species` for the human-readable name and
     * deduplicates by `tour_fid` so a tour with two sightings of the same
     * co-occurring species is counted once.
     *
     * @param {number} speciesId
     * @param {string | undefined} periodFrom
     * @param {string | undefined} periodTo
     * @param {number[] | undefined} organizationIds
     * @return {Array<{species_id: number; species_name: string; tour_count: number;}>}
     */
    public async findCooccurringSpecies(
        speciesId: number,
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Array<{species_id: number; species_name: string; tour_count: number;}>> {
        if (organizationIds !== undefined && organizationIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('o')
            .select('o.species_id', 'species_id')
            .addSelect('sp.name', 'species_name')
            .addSelect('COUNT(DISTINCT o.tour_fid)', 'tour_count')
            .innerJoin('species', 'sp', 'sp.id = o.species_id')
            .innerJoin(
                (sub) => sub
                    .select('DISTINCT inner_s.tour_fid', 'tour_fid')
                    .from('sighting', 'inner_s')
                    .where('inner_s.species_id = :sid', {sid: speciesId})
                    .andWhere('inner_s.deleted = :del', {del: false})
                    .andWhere('inner_s.tour_fid <> :empty', {empty: ''}),
                't',
                't.tour_fid = o.tour_fid'
            )
            .where('o.species_id <> :sid', {sid: speciesId})
            .andWhere('o.deleted = :del', {del: false})
            .groupBy('o.species_id')
            .addGroupBy('sp.name')
            .orderBy('tour_count', 'DESC')
            .limit(20);

        const from = (periodFrom ?? '').trim();
        const to = (periodTo ?? '').trim();
        if (from !== '') {
            qb.andWhere('o.date >= :from', {from});
        }
        if (to !== '') {
            qb.andWhere('o.date <= :to', {to});
        }

        if (organizationIds !== undefined) {
            qb.innerJoin('vehicle', 'v', 'v.id = o.vehicle_id')
                .andWhere('v.organization_id IN (:...orgIds)', {orgIds: organizationIds});
        }

        const rows = await qb.getRawMany<{species_id: number | string; species_name: string; tour_count: number | string;}>();
        return rows.map((r) => ({
            species_id: Number(r.species_id),
            species_name: r.species_name,
            tour_count: Number(r.tour_count)
        }));
    }

}