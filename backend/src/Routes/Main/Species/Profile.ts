import {StatusCodes} from 'figtree-schemas';
import {
    SpeciesProfile as SpeciesProfileData,
    SpeciesProfileBucket,
    SpeciesProfileCategoryShare,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileIcc,
    SpeciesProfileMonthlyEffort,
    SpeciesProfileMovement,
    SpeciesProfileRequest,
    SpeciesProfileResponse
} from 'mwpa_schemas';
import {Vts} from 'vts';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingSeismicRepository} from '../../../Db/MariaDb/Repositories/SightingSeismicRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {ClimateIndexRepository} from '../../../Db/MariaDb/Repositories/ClimateIndexRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';
import {ClimateRow, Phenology} from './Phenology.js';
import {ResponseCurves} from './ResponseCurves.js';
import {SpatialPoint, SpatialStats} from './SpatialStats.js';

/**
 * Background row (any species) for the target-group response curves.
 */
export type EnvBackgroundRow = {
    distance_coast: string;
    depth_m: number | null;
    sst_c_day: number | null;
    chl_a_mg_m3_day: number | null;
};

/**
 * Row shape returned by SightingRepository.findForSpeciesProfile. Declared
 * at module level because it's the value-bag the repository hands back;
 * not a function (the project rules forbid free functions but types are fine).
 */
export type SightingProfileRow = {
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
    current_region_mean_speed_m_s_day: number | null;
    current_coastal_component_m_s_day: number | null;
    wave_height_m_day: number | null;
    uv_index_day: number | null;
    wind_speed_m_s_day: number | null;
    avg_speed_mps: number | null;
    max_speed_mps: number | null;
    total_distance_m: number | null;
    dominant_heading_deg: number | null;
    fishing_hours_day_25km: number | null;
};

/** Per-row counts, temporal buckets and positions collected in one pass. */
type ProfileCounts = {
    monthly: Map<string, number>;
    hourly: number[];
    monthlySightings: Map<string, number>;
    yearlyCounts: Map<string, number>;
    uniqueTours: Set<string>;
    groupSizes: number[];
    totalCount: number;
    withJuv: number;
    withCalves: number;
    withNewborns: number;
    dataMinDate: string;
    dataMaxDate: string;
    spatialPoints: SpatialPoint[];
    heatmap: SpeciesProfileHeatmapPoint[];
};

/** Per-sighting environmental series, each filtered to finite values. */
type ProfileEnvSeries = {
    distanceCoast: number[];
    depth: number[];
    sst: number[];
    chl: number[];
    salinity: number[];
    sla: number[];
    currentSpeed: number[];
    currentRegionSpeed: number[];
    currentCoastal: number[];
    waveHeight: number[];
    uvIndex: number[];
    windSpeed: number[];
    beaufort: number[];
    otherBoats: number[];
    fishingHours: number[];
};

/**
 * Profile
 *
 * Build the per-species profile snapshot. One SightingRepository query +
 * one SightingExtended lookup; histogramming runs in JS over the materialised
 * rows. Row counts even for the most prolific species are in the low
 * thousands, so streaming/server-side bucketing is not worth the complexity.
 *
 * All helpers (bucketize, percentile) live as private static methods on this
 * class — the codebase convention is no free functions.
 */
export class Profile {

    /**
     * Histogram bucket edges (in target unit). Open-ended top bucket — the
     * final `bucket_max` is set to the observed max+1 so the chart can render
     * a finite range without dropping outliers.
     */
    private static readonly GROUP_SIZE_EDGES = [1, 2, 3, 5, 10, 20, 50, 100];
    private static readonly DISTANCE_COAST_EDGES_M = [0, 500, 1000, 2000, 5000, 10000, 25000, 50000];
    private static readonly DEPTH_EDGES_M = [0, 25, 50, 100, 200, 500, 1000, 2000];
    private static readonly SST_EDGES_C = [10, 13, 16, 19, 22, 25, 28];
    private static readonly CHL_EDGES_MG_M3 = [0, 0.1, 0.25, 0.5, 1, 2, 5];

    // Phase 3 — extra env distributions
    private static readonly SALINITY_EDGES_PSU = [34, 35, 36, 37, 38, 39];
    private static readonly SLA_EDGES_CM = [-20, -10, -5, 0, 5, 10, 20];
    private static readonly CURRENT_EDGES_M_S = [0, 0.1, 0.25, 0.5, 1];
    private static readonly CURRENT_REGION_EDGES_M_S = [0, 0.1, 0.25, 0.5, 1];
    private static readonly CURRENT_COASTAL_EDGES_M_S = [-1, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 1];
    private static readonly WAVE_EDGES_M = [0, 0.5, 1, 1.5, 2, 3];
    private static readonly UV_EDGES = [0, 2, 4, 6, 8, 10];
    private static readonly WIND_EDGES_M_S = [0, 2, 4, 6, 8, 10, 14, 18];

    // Phase 3 — pressure histograms
    private static readonly BEAUFORT_EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    private static readonly OTHER_BOATS_EDGES = [0, 1, 2, 3, 5, 10];
    private static readonly FISHING_HOURS_EDGES = [0, 0.5, 1, 2, 5, 10, 25];

    /**
     * Bucket edges for the seismic-exposure card. Magnitude edges
     * mirror USGS' significant-event thresholds; distance edges fit
     * the 200 km correlation radius the EarthquakeService writes.
     */
    private static readonly SEISMIC_MAG_EDGES = [2.5, 3, 3.5, 4, 4.5, 5, 6];
    private static readonly SEISMIC_DIST_EDGES_KM = [0, 25, 50, 100, 150, 200];
    private static readonly SEISMIC_OFFSET_EDGES_H = [-336, -168, -72, -24, 0, 24, 72, 168, 336];

    /**
     * Heading-rose bins (8-way compass — center degrees in clockwise order).
     */
    private static readonly HEADING_BINS: ReadonlyArray<{deg: number; label: string;}> = [
        {deg: 0,   label: 'N'},
        {deg: 45,  label: 'NE'},
        {deg: 90,  label: 'E'},
        {deg: 135, label: 'SE'},
        {deg: 180, label: 'S'},
        {deg: 225, label: 'SW'},
        {deg: 270, label: 'W'},
        {deg: 315, label: 'NW'}
    ];

    /**
     * Heatmap cap — even prolific species rarely exceed this; the page only
     * needs enough points for a kernel-density visual, not a row-perfect dump.
     */
    private static readonly HEATMAP_MAX_POINTS = 2000;

    public static async getProfile(
        request: SpeciesProfileRequest | undefined,
        organizationIds: number[] | undefined
    ): Promise<SpeciesProfileResponse> {
        if (Vts.isUndefined(request)) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
        }

        const species = await SpeciesRepository.getInstance().findOne(request.species_id);
        if (!species) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Species not found'};
        }

        const rows = await SightingRepository.getInstance().findForSpeciesProfile(
            request.species_id,
            request.period_from,
            request.period_to,
            organizationIds
        );

        // Reference lookups for label resolution. Both tables are small
        // (<100 rows each) so we don't filter — single loadAll fits in memory.
        const behStates = await BehaviouralStatesRepository.getInstance().findAll();
        const behById = new Map<number, string>();
        for (const b of behStates) {
            behById.set(b.id, b.name);
        }
        const encCats = await EncounterCategoriesRepository.getInstance().findAll();
        const reactionById = new Map<number, string>();
        for (const c of encCats) {
            reactionById.set(c.id, c.name);
        }

        // Seismic — correlations from sighting_seismic; same period +
        // org scope.
        const seismicRows = await SightingSeismicRepository.getInstance().findForSpecies(
            request.species_id,
            request.period_from,
            request.period_to,
            organizationIds
        );

        // SPUE — tour-hours per month inside the same time window and
        // org scope as the sighting query. Independent of species; one
        // extra grouped query.
        const tourHours = await SightingTourRepository.getInstance().aggregateMonthlyTourHours(
            request.period_from,
            request.period_to,
            organizationIds
        );

        // Co-occurrence — top-N other species seen on the same tour_fids.
        const cooccurring = await SightingRepository.getInstance().findCooccurringSpecies(
            request.species_id,
            request.period_from,
            request.period_to,
            organizationIds
        );

        // Target-group background (env of ALL species) for the response curves.
        const background = await SightingRepository.getInstance().findEnvBackground(
            request.period_from,
            request.period_to,
            organizationIds
        );

        // Monthly climate indices for the phenology trend's B4 overlay.
        const climateRows = await ClimateIndexRepository.getInstance().findAllRows();

        const profile: SpeciesProfileData = Profile._aggregate(
            species.id,
            species.name,
            rows,
            request,
            behById,
            reactionById,
            tourHours,
            cooccurring,
            seismicRows,
            background,
            climateRows
        );

        return {statusCode: StatusCodes.OK, profile};
    }

    /**
     * Build histogram buckets from a sorted edge list. Values < the smallest
     * edge land in the first bucket, values >= the largest edge land in an
     * extra trailing bucket whose `bucket_max` is set to max(observed,tail)+1
     * so the chart sees a finite range.
     */
    private static _bucketize(values: number[], edges: number[]): SpeciesProfileBucket[] {
        const sortedEdges = [...edges].sort((a, b) => a - b);
        const buckets: SpeciesProfileBucket[] = [];

        for (let i = 0; i < sortedEdges.length - 1; i++) {
            buckets.push({bucket_min: sortedEdges[i], bucket_max: sortedEdges[i + 1], count: 0});
        }
        const tailMax = sortedEdges[sortedEdges.length - 1];
        buckets.push({bucket_min: tailMax, bucket_max: tailMax, count: 0});

        let observedMax = tailMax;

        for (const v of values) {
            if (!Number.isFinite(v)) {
                continue;
            }
            if (v > observedMax) {
                observedMax = v;
            }
            Profile._placeValue(buckets, v);
        }

        if (observedMax > tailMax) {
            buckets[buckets.length - 1].bucket_max = Math.ceil(observedMax + 1);
        }

        return buckets;
    }

    /**
     * Increment the half-open bucket [min, max) that `v` falls into, or the
     * open-ended tail bucket when it lands beyond every edge.
     * @private
     */
    private static _placeValue(buckets: SpeciesProfileBucket[], v: number): void {
        for (let i = 0; i < buckets.length - 1; i++) {
            if (v >= buckets[i].bucket_min && v < buckets[i].bucket_max) {
                buckets[i].count++;

                return;
            }
        }

        buckets[buckets.length - 1].count++;
    }

    /**
     * Percentile of a numeric array via linear interpolation. Empty → 0.
     */
    private static _percentile(values: number[], p: number): number {
        if (values.length === 0) {
            return 0;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const rank = (p / 100) * (sorted.length - 1);
        const lo = Math.floor(rank);
        const hi = Math.ceil(rank);
        if (lo === hi) {
            return sorted[lo];
        }
        const frac = rank - lo;
        return sorted[lo] * (1 - frac) + sorted[hi] * frac;
    }

    /**
     * One-way random-effects intraclass correlation ICC(1) for a metric whose
     * values are grouped by tour. Decomposes the variance into between-tour and
     * within-tour parts via a standard ANOVA:
     *
     *   MS_between = SS_between / (k - 1),  MS_within = SS_within / (N - k)
     *   n0 = (N - Σn_g²/N) / (k - 1)            // mean group size (unbalanced)
     *   σ²_between = (MS_between - MS_within) / n0,   σ²_within = MS_within
     *   ICC = σ²_between / (σ²_between + σ²_within)
     *
     * ICC near 0 = sightings vary independently of tour; near 1 = the metric is
     * essentially fixed per tour (strong pseudo-replication). Returns null when
     * there are fewer than two tours or no within-tour degrees of freedom — the
     * decomposition is undefined there. ICC is clamped to [0, 1] (a slightly
     * negative σ²_between from sampling noise reads as 0).
     */
    private static _icc(byTour: Map<string, number[]>): {icc: number; nTours: number; nObs: number;} | null {
        const groups = [...byTour.values()].filter((g) => g.length > 0);
        const k = groups.length;
        let n = 0;
        for (const g of groups) {
            n += g.length;
        }

        if (k < 2 || n <= k) {
            return null;
        }

        let grandSum = 0;
        for (const g of groups) {
            for (const x of g) {
                grandSum += x;
            }
        }
        const grand = grandSum / n;

        let ssBetween = 0;
        let ssWithin = 0;
        let sumNg2 = 0;
        for (const g of groups) {
            const ng = g.length;
            const mean = g.reduce((a, b) => a + b, 0) / ng;
            ssBetween += ng * ((mean - grand) ** 2);
            for (const x of g) {
                ssWithin += (x - mean) ** 2;
            }
            sumNg2 += ng * ng;
        }

        const msBetween = ssBetween / (k - 1);
        const msWithin = ssWithin / (n - k);
        const n0 = (n - (sumNg2 / n)) / (k - 1);

        if (n0 <= 0) {
            return null;
        }

        const varBetween = (msBetween - msWithin) / n0;
        const denom = varBetween + msWithin;
        let icc = denom > 0 ? varBetween / denom : 0;
        icc = Math.max(0, Math.min(1, icc));

        return {icc: Math.round(icc * 1000) / 1000, nTours: k, nObs: n};
    }

    /**
     * Compute per-metric tour ICCs over the profile rows. Each metric groups
     * its finite values by `tour_fid`, then runs {@link _icc}; metrics with too
     * few tours are omitted.
     */
    private static _tourIcc(rows: SightingProfileRow[]): SpeciesProfileIcc[] {
        const metrics: {key: string; label: string; get: (r: SightingProfileRow) => number | null;}[] = [
            {key: 'group_size', label: 'Group size', get: (r): number => Number(r.species_count) || 0},
            {key: 'distance_coast', label: 'Distance to coast', get: (r): number | null => {
                const d = parseFloat(r.distance_coast ?? '');
                return Number.isFinite(d) && d >= 0 ? d : null;
            }},
            {key: 'depth', label: 'Depth', get: (r): number | null =>
                r.depth_m !== null && Number.isFinite(r.depth_m) ? Math.abs(r.depth_m) : null},
            {key: 'sst_c', label: 'SST', get: (r): number | null =>
                r.sst_c_day !== null && Number.isFinite(r.sst_c_day) ? r.sst_c_day : null},
            {key: 'chl_a', label: 'Chlorophyll-a', get: (r): number | null =>
                r.chl_a_mg_m3_day !== null && Number.isFinite(r.chl_a_mg_m3_day) ? r.chl_a_mg_m3_day : null},
            {key: 'salinity', label: 'Salinity', get: (r): number | null =>
                r.salinity_psu_day !== null && Number.isFinite(r.salinity_psu_day) ? r.salinity_psu_day : null},
            {key: 'wave_height', label: 'Wave height', get: (r): number | null =>
                r.wave_height_m_day !== null && Number.isFinite(r.wave_height_m_day) ? r.wave_height_m_day : null},
            {key: 'beaufort', label: 'Beaufort', get: (r): number | null =>
                Number.isFinite(r.beaufort_wind) && r.beaufort_wind >= 0 ? r.beaufort_wind : null}
        ];

        const out: SpeciesProfileIcc[] = [];

        for (const m of metrics) {
            const byTour = new Map<string, number[]>();
            for (const r of rows) {
                const fid = r.tour_fid;
                if (!fid || fid.trim() === '') {
                    continue;
                }
                const v = m.get(r);
                if (v === null || !Number.isFinite(v)) {
                    continue;
                }
                const arr = byTour.get(fid) ?? [];
                arr.push(v);
                byTour.set(fid, arr);
            }

            const res = Profile._icc(byTour);
            if (res !== null) {
                out.push({metric_key: m.key, label: m.label, icc: res.icc, n_tours: res.nTours, n_obs: res.nObs});
            }
        }

        return out;
    }

    /**
     * Parse the JSON-stringified `behaviours` column. The legacy format is
     * an object whose values are stringified BehaviouralStates.id values
     * (see firstActivityLabel in OfficeReport/CreateExport). Returns the
     * list of label-names; empty array on parse error / unknown ids.
     */
    private static _parseBehaviourLabels(json: string, behById: Map<number, string>): string[] {
        if (!json) {
            return [];
        }
        try {
            const data = JSON.parse(json);
            if (!data || typeof data !== 'object') {
                return [];
            }
            const labels: string[] = [];
            for (const value of Object.values(data)) {
                let id = NaN;
                if (typeof value === 'string') {
                    id = parseInt(value, 10);
                } else if (typeof value === 'number') {
                    id = value;
                }
                const name = Number.isFinite(id) ? behById.get(id) : undefined;
                if (name) {
                    labels.push(name);
                }
            }
            return labels;
        } catch {
            return [];
        }
    }

    /**
     * Bin a heading (degrees, 0=N clockwise) into one of {@link HEADING_BINS}.
     * Returns the bin's index.
     */
    private static _headingBinIndex(deg: number): number {
        const normalised = ((deg % 360) + 360) % 360;
        // 8 bins of 45° wide, centered on 0/45/.../315 — shift by 22.5° so a
        // heading of e.g. 30° falls into the N bin (0 ± 22.5) instead of NE.
        return Math.floor(((normalised + 22.5) % 360) / 45);
    }

    private static _emptyHeadingRose(): SpeciesProfileHeadingBin[] {
        const out: SpeciesProfileHeadingBin[] = [];
        for (const bin of Profile.HEADING_BINS) {
            out.push({bin_deg: bin.deg, label: bin.label, count: 0});
        }
        return out;
    }

    private static _parsePositionLonLat(json: string): {lon: number; lat: number;} | null {
        if (!json) {
            return null;
        }
        try {
            const pos = JSON.parse(json) as {latitude?: number; longitude?: number;};
            if (typeof pos.latitude === 'number' && typeof pos.longitude === 'number' &&
                Number.isFinite(pos.latitude) && Number.isFinite(pos.longitude)) {
                return {lon: pos.longitude, lat: pos.latitude};
            }
        } catch { /* ignore */ }
        return null;
    }

    /**
     * Reduce a label→count map to the most common entries — keeps the donut
     * chart legible (capped at `keep`, the rest collapses into "other").
     */
    private static _topShares(counts: Map<string, number>, keep: number = 8): SpeciesProfileCategoryShare[] {
        const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        if (entries.length <= keep) {
            return entries.map(([label, count]) => ({label, count}));
        }
        const top = entries.slice(0, keep - 1).map(([label, count]) => ({label, count}));
        const otherCount = entries.slice(keep - 1).reduce((sum, [, c]) => sum + c, 0);
        if (otherCount > 0) {
            top.push({label: 'other', count: otherCount});
        }
        return top;
    }

    /**
     * Behaviour co-occurrence for a chord diagram: the top behaviours by solo
     * frequency (nodes) and how often each pair was recorded in the SAME
     * sighting (undirected links, indices into `labels`). This is co-occurrence,
     * not a transition sequence — the behaviours column is an unordered set per
     * sighting, so no ethogram ordering is implied.
     */
    private static _buildBehaviourCooc(
        solo: Map<string, number>,
        cooc: Map<string, Map<string, number>>
    ): {labels: string[]; links: {source: number; target: number; value: number;}[];} {
        const labels = [...solo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label]) => label);
        const index = new Map<string, number>();
        labels.forEach((label, i) => index.set(label, i));

        const links: {source: number; target: number; value: number;}[] = [];
        for (const [a, inner] of cooc) {
            const ai = index.get(a);
            if (ai === undefined) {
                continue;
            }
            for (const [b, value] of inner) {
                const bi = index.get(b);
                if (bi !== undefined) {
                    links.push({source: ai, target: bi, value: value});
                }
            }
        }

        return {labels: labels, links: links};
    }

    /**
     * Parse the legacy `other_vehicle` text column into an integer count
     * of "other boats present". The legacy UI stored either a free-text
     * description or a leading digit/CSV; we take the first integer we
     * find, default to 0 when nothing parseable.
     */
    private static _parseOtherBoats(text: string): number {
        if (!text) {
            return 0;
        }
        const m = text.match(/-?\d+/u);
        if (!m) {
            return 0;
        }
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    }

    private static _aggregate(
        speciesId: number,
        speciesName: string,
        rows: SightingProfileRow[],
        request: SpeciesProfileRequest,
        behById: Map<number, string>,
        reactionById: Map<number, string>,
        tourHours: Map<string, number>,
        cooccurring: Array<{species_id: number; species_name: string; tour_count: number;}>,
        seismicRows: Array<{sighting_id: number; distance_km: number; hours_offset: number; magnitude: number;}>,
        background: EnvBackgroundRow[],
        climate: ClimateRow[]
    ): SpeciesProfileData {
        const counts = Profile._collectCounts(rows);
        const env = Profile._collectEnvSeries(rows);
        const beh = Profile._collectBehaviour(rows, behById, reactionById);
        const mv = Profile._collectMovement(rows);
        const seis = Profile._collectSeismic(seismicRows);
        const bg = Profile._collectBackground(background);

        const movement: SpeciesProfileMovement = {
            n_with_movement: mv.nWithMovement,
            median_avg_speed_kt: Profile._percentile(mv.avgSpeed, 50),
            median_max_speed_kt: Profile._percentile(mv.maxSpeed, 50),
            median_total_distance_m: Profile._percentile(mv.totalDist, 50),
            heading_rose: mv.headingRose
        };

        const yearly = [...counts.yearlyCounts.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([y, count]) => ({y: y, count: count}));

        const cooccurrence: SpeciesProfileCategoryShare[] = cooccurring.map((c) => ({
            label: c.species_name,
            count: c.tour_count
        }));

        // Target-group response curves — the species' share of all sightings
        // per environment bin (background = where surveying happened).
        const response = background.length === 0 ? undefined : {
            sst_c: ResponseCurves.build(env.sst, bg.sst, Profile.SST_EDGES_C),
            chl_a: ResponseCurves.build(env.chl, bg.chl, Profile.CHL_EDGES_MG_M3),
            depth_m: ResponseCurves.build(env.depth, bg.depth, Profile.DEPTH_EDGES_M),
            distance_coast_m: ResponseCurves.build(env.distanceCoast, bg.dist, Profile.DISTANCE_COAST_EDGES_M)
        };

        return {
            species_id: speciesId,
            species_name: speciesName,
            period_from: request.period_from ?? counts.dataMinDate,
            period_to: request.period_to ?? counts.dataMaxDate,
            n_sightings: rows.length,
            n_unique_tours: counts.uniqueTours.size,
            group_size_total: counts.totalCount,
            group_size_p50: Profile._percentile(counts.groupSizes, 50),
            group_size_p95: Profile._percentile(counts.groupSizes, 95),
            monthly: [...counts.monthly.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ym, count]) => ({ym, count})),
            hourly: counts.hourly.map((count, hour) => ({hour, count})),
            group_size: Profile._bucketize(counts.groupSizes, Profile.GROUP_SIZE_EDGES),
            group_ratios: {
                with_juveniles: counts.withJuv,
                with_calves: counts.withCalves,
                with_newborns: counts.withNewborns,
                total: rows.length
            },
            env: {
                distance_coast_m: Profile._bucketize(env.distanceCoast, Profile.DISTANCE_COAST_EDGES_M),
                depth_m: Profile._bucketize(env.depth, Profile.DEPTH_EDGES_M),
                sst_c: Profile._bucketize(env.sst, Profile.SST_EDGES_C),
                chl_a_mg_m3: Profile._bucketize(env.chl, Profile.CHL_EDGES_MG_M3)
            },
            behaviour_mix: Profile._topShares(beh.behaviourCounts),
            reaction_mix: Profile._topShares(beh.reactionCounts),
            movement: movement,
            heatmap: counts.heatmap,
            monthly_effort: Profile._monthlyEffort(tourHours, counts.monthlySightings),
            yearly: yearly,
            env_extra: {
                salinity_psu: Profile._bucketize(env.salinity, Profile.SALINITY_EDGES_PSU),
                sla_cm: Profile._bucketize(env.sla, Profile.SLA_EDGES_CM),
                current_speed_m_s: Profile._bucketize(env.currentSpeed, Profile.CURRENT_EDGES_M_S),
                current_region_speed_m_s: Profile._bucketize(env.currentRegionSpeed, Profile.CURRENT_REGION_EDGES_M_S),
                current_coastal_component_m_s: Profile._bucketize(env.currentCoastal, Profile.CURRENT_COASTAL_EDGES_M_S),
                wave_height_m: Profile._bucketize(env.waveHeight, Profile.WAVE_EDGES_M),
                uv_index: Profile._bucketize(env.uvIndex, Profile.UV_EDGES),
                wind_speed_m_s: Profile._bucketize(env.windSpeed, Profile.WIND_EDGES_M_S)
            },
            pressure: {
                beaufort: Profile._bucketize(env.beaufort, Profile.BEAUFORT_EDGES),
                other_boats: Profile._bucketize(env.otherBoats, Profile.OTHER_BOATS_EDGES),
                fishing_hours_25km: Profile._bucketize(env.fishingHours, Profile.FISHING_HOURS_EDGES)
            },
            cooccurrence: cooccurrence,
            seismic: {
                n_sightings_with_event: seis.sightings.size,
                n_correlations: seismicRows.length,
                max_magnitude: seis.maxMag,
                median_distance_km: Profile._percentile(seis.distances, 50),
                magnitude: Profile._bucketize(seis.magnitudes, Profile.SEISMIC_MAG_EDGES),
                distance_km: Profile._bucketize(seis.distances, Profile.SEISMIC_DIST_EDGES_KM),
                hours_offset: Profile._bucketize(seis.offsets, Profile.SEISMIC_OFFSET_EDGES_H)
            },
            icc: Profile._tourIcc(rows),
            spatial: SpatialStats.compute(counts.spatialPoints) ?? undefined,
            response: response,
            phenology: Phenology.build(counts.monthlySightings, counts.yearlyCounts, tourHours, climate),
            behaviour_cooccurrence: Profile._buildBehaviourCooc(beh.behaviourCounts, beh.behCooc)
        };
    }

    /**
     * Finite per-sighting env series mapped onto {@link ProfileEnvSeries} keys.
     * @private
     */
    private static readonly _ENV_FINITE: {key: keyof ProfileEnvSeries; get: (r: SightingProfileRow) => number | null; abs?: boolean;}[] = [
        {key: 'depth', get: (r): number | null => r.depth_m, abs: true},
        {key: 'sst', get: (r): number | null => r.sst_c_day},
        {key: 'chl', get: (r): number | null => r.chl_a_mg_m3_day},
        {key: 'salinity', get: (r): number | null => r.salinity_psu_day},
        {key: 'sla', get: (r): number | null => r.sla_cm_day},
        {key: 'currentSpeed', get: (r): number | null => r.current_speed_m_s_day},
        {key: 'currentRegionSpeed', get: (r): number | null => r.current_region_mean_speed_m_s_day},
        {key: 'currentCoastal', get: (r): number | null => r.current_coastal_component_m_s_day},
        {key: 'waveHeight', get: (r): number | null => r.wave_height_m_day},
        {key: 'uvIndex', get: (r): number | null => r.uv_index_day},
        {key: 'windSpeed', get: (r): number | null => r.wind_speed_m_s_day}
    ];

    /**
     * Collect per-row counts, temporal buckets, demographics and positions.
     * @private
     */
    private static _collectCounts(rows: SightingProfileRow[]): ProfileCounts {
        const c: ProfileCounts = {
            monthly: new Map<string, number>(),
            hourly: new Array<number>(24).fill(0),
            monthlySightings: new Map<string, number>(),
            yearlyCounts: new Map<string, number>(),
            uniqueTours: new Set<string>(),
            groupSizes: [],
            totalCount: 0,
            withJuv: 0,
            withCalves: 0,
            withNewborns: 0,
            dataMinDate: '',
            dataMaxDate: '',
            spatialPoints: [],
            heatmap: []
        };

        for (const r of rows) {
            Profile._collectTemporal(c, r);
            Profile._collectDemographics(c, r);
            Profile._collectPosition(c, r);
        }

        return c;
    }

    /**
     * Fold one row's tour id and month/year/hour buckets into the counts.
     * @private
     */
    private static _collectTemporal(c: ProfileCounts, r: SightingProfileRow): void {
        if (r.tour_fid && r.tour_fid.trim() !== '') {
            c.uniqueTours.add(r.tour_fid);
        }

        const ym = (r.date ?? '').substring(0, 7);
        if (ym.length === 7) {
            c.monthly.set(ym, (c.monthly.get(ym) ?? 0) + 1);
            c.monthlySightings.set(ym, (c.monthlySightings.get(ym) ?? 0) + 1);
        }

        const yr = (r.date ?? '').substring(0, 4);
        if (yr.length === 4) {
            c.yearlyCounts.set(yr, (c.yearlyCounts.get(yr) ?? 0) + 1);
        }

        const hm = (r.tour_start ?? '').match(/^(\d{1,2}):/u);
        if (hm && Number(hm[1]) >= 0 && Number(hm[1]) < 24) {
            c.hourly[parseInt(hm[1], 10)]++;
        }

        Profile._updateDateRange(c, r.date ?? '');
    }

    /**
     * Widen the observed [dataMinDate, dataMaxDate] range with one date.
     * @private
     */
    private static _updateDateRange(c: ProfileCounts, date: string): void {
        if (date !== '' && (c.dataMinDate === '' || date < c.dataMinDate)) {
            c.dataMinDate = date;
        }

        if (date !== '' && date > c.dataMaxDate) {
            c.dataMaxDate = date;
        }
    }

    /**
     * Fold one row's group size and juvenile/calf/newborn flags into counts.
     * @private
     */
    private static _collectDemographics(c: ProfileCounts, r: SightingProfileRow): void {
        const n = Number(r.species_count) || 0;
        c.groupSizes.push(n);
        c.totalCount += n;

        if ((Number(r.juveniles) || 0) > 0) {
            c.withJuv++;
        }

        if ((Number(r.calves) || 0) > 0) {
            c.withCalves++;
        }

        if ((Number(r.newborns) || 0) > 0) {
            c.withNewborns++;
        }
    }

    /**
     * Fold one row's position into the spatial points (uncapped) and the
     * heatmap overlay (capped to keep the payload small).
     * @private
     */
    private static _collectPosition(c: ProfileCounts, r: SightingProfileRow): void {
        const pos = Profile._parsePositionLonLat(r.location_begin);
        if (pos === null) {
            return;
        }

        const weight = Number(r.species_count) || 0;
        c.spatialPoints.push({lon: pos.lon, lat: pos.lat, weight: weight});

        if (c.heatmap.length < Profile.HEATMAP_MAX_POINTS) {
            c.heatmap.push({lon: pos.lon, lat: pos.lat, count: weight});
        }
    }

    /**
     * Collect the finite per-sighting environmental series.
     * @private
     */
    private static _collectEnvSeries(rows: SightingProfileRow[]): ProfileEnvSeries {
        const env: ProfileEnvSeries = {
            distanceCoast: [],
            depth: [],
            sst: [],
            chl: [],
            salinity: [],
            sla: [],
            currentSpeed: [],
            currentRegionSpeed: [],
            currentCoastal: [],
            waveHeight: [],
            uvIndex: [],
            windSpeed: [],
            beaufort: [],
            otherBoats: [],
            fishingHours: []
        };

        for (const r of rows) {
            Profile._collectEnvRow(env, r);
        }

        return env;
    }

    /**
     * Fold one row's finite environmental values into the series.
     * @private
     */
    private static _collectEnvRow(env: ProfileEnvSeries, r: SightingProfileRow): void {
        for (const m of Profile._ENV_FINITE) {
            const v = m.get(r);
            if (v !== null && Number.isFinite(v)) {
                env[m.key].push(m.abs === true ? Math.abs(v) : v);
            }
        }

        Profile._collectEnvSpecials(env, r);
    }

    /**
     * Fold the non-uniform env fields (parsed distance, beaufort, other boats,
     * fishing hours) that don't fit the finite-series table.
     * @private
     */
    private static _collectEnvSpecials(env: ProfileEnvSeries, r: SightingProfileRow): void {
        const dist = parseFloat(r.distance_coast ?? '');
        if (Number.isFinite(dist) && dist >= 0) {
            env.distanceCoast.push(dist);
        }

        if (Number.isFinite(r.beaufort_wind) && r.beaufort_wind >= 0) {
            env.beaufort.push(r.beaufort_wind);
        }

        env.otherBoats.push(Profile._parseOtherBoats(r.other_vehicle ?? ''));

        const fish = r.fishing_hours_day_25km;
        if (fish !== null && Number.isFinite(fish)) {
            env.fishingHours.push(Number(fish));
        }
    }

    /**
     * Collect behaviour solo counts, behaviour co-occurrence pairs and
     * reaction counts. Behaviours are deduped within a sighting.
     * @private
     */
    private static _collectBehaviour(
        rows: SightingProfileRow[],
        behById: Map<number, string>,
        reactionById: Map<number, string>
    ): {behaviourCounts: Map<string, number>; behCooc: Map<string, Map<string, number>>; reactionCounts: Map<string, number>;} {
        const behaviourCounts = new Map<string, number>();
        const behCooc = new Map<string, Map<string, number>>();
        const reactionCounts = new Map<string, number>();

        for (const r of rows) {
            const behLabels = [...new Set(Profile._parseBehaviourLabels(r.behaviours, behById))]
                .sort((p, q) => (p < q ? -1 : 1));

            for (const label of behLabels) {
                behaviourCounts.set(label, (behaviourCounts.get(label) ?? 0) + 1);
            }

            Profile._accumulateCooc(behCooc, behLabels);

            if (r.reaction_id > 0) {
                const rname = reactionById.get(r.reaction_id);
                if (rname) {
                    reactionCounts.set(rname, (reactionCounts.get(rname) ?? 0) + 1);
                }
            }
        }

        return {behaviourCounts: behaviourCounts, behCooc: behCooc, reactionCounts: reactionCounts};
    }

    /**
     * Accumulate every unordered behaviour pair in one sighting's labels.
     * @private
     */
    private static _accumulateCooc(behCooc: Map<string, Map<string, number>>, labels: string[]): void {
        for (let bi = 0; bi < labels.length; bi++) {
            for (let bj = bi + 1; bj < labels.length; bj++) {
                const inner = behCooc.get(labels[bi]) ?? new Map<string, number>();
                inner.set(labels[bj], (inner.get(labels[bj]) ?? 0) + 1);
                behCooc.set(labels[bi], inner);
            }
        }
    }

    /**
     * Collect movement speeds (converted to knots), distances and the heading
     * rose. Only rows carrying a derived SightingMovement contribute.
     * @private
     */
    private static _collectMovement(rows: SightingProfileRow[]): {
        avgSpeed: number[];
        maxSpeed: number[];
        totalDist: number[];
        nWithMovement: number;
        headingRose: ReturnType<typeof Profile._emptyHeadingRose>;
    } {
        const avgSpeed: number[] = [];
        const maxSpeed: number[] = [];
        const totalDist: number[] = [];
        let nWithMovement = 0;
        const headingRose = Profile._emptyHeadingRose();

        for (const r of rows) {
            if (r.avg_speed_mps !== null && Number.isFinite(r.avg_speed_mps)) {
                avgSpeed.push(r.avg_speed_mps * 1.9438);
                nWithMovement++;
            }

            if (r.max_speed_mps !== null && Number.isFinite(r.max_speed_mps)) {
                maxSpeed.push(r.max_speed_mps * 1.9438);
            }

            if (r.total_distance_m !== null && Number.isFinite(r.total_distance_m)) {
                totalDist.push(r.total_distance_m);
            }

            if (r.dominant_heading_deg !== null && Number.isFinite(r.dominant_heading_deg)) {
                Profile._accumulateHeading(headingRose, r.dominant_heading_deg);
            }
        }

        return {avgSpeed: avgSpeed, maxSpeed: maxSpeed, totalDist: totalDist, nWithMovement: nWithMovement, headingRose: headingRose};
    }

    /**
     * Bump the heading-rose bin the degree falls into, if any.
     * @private
     */
    private static _accumulateHeading(rose: ReturnType<typeof Profile._emptyHeadingRose>, deg: number): void {
        const idx = Profile._headingBinIndex(deg);
        if (idx >= 0 && idx < rose.length) {
            rose[idx].count++;
        }
    }

    /**
     * SPUE table — join monthly tour-hours with sightings, sorted by month.
     * Months with 0 effort get spue 0 (no surveys → undefined, shown as 0).
     * @private
     */
    private static _monthlyEffort(
        tourHours: Map<string, number>,
        monthlySightings: Map<string, number>
    ): SpeciesProfileMonthlyEffort[] {
        const out: SpeciesProfileMonthlyEffort[] = [];
        const ymKeys = new Set<string>([...tourHours.keys(), ...monthlySightings.keys()]);
        const ymSorted = [...ymKeys].sort((a, b) => a.localeCompare(b));

        for (const ym of ymSorted) {
            const hours = tourHours.get(ym) ?? 0;
            const sightings = monthlySightings.get(ym) ?? 0;
            out.push({
                ym: ym,
                tour_hours: Math.round(hours * 10) / 10,
                sightings: sightings,
                spue: hours > 0 ? sightings / hours : 0
            });
        }

        return out;
    }

    /**
     * Collect the seismic correlation aggregates (per sighting that had an
     * event within the configured window).
     * @private
     */
    private static _collectSeismic(
        seismicRows: {sighting_id: number; distance_km: number; hours_offset: number; magnitude: number;}[]
    ): {sightings: Set<number>; magnitudes: number[]; distances: number[]; offsets: number[]; maxMag: number;} {
        const sightings = new Set<number>();
        const magnitudes: number[] = [];
        const distances: number[] = [];
        const offsets: number[] = [];
        let maxMag = 0;

        for (const r of seismicRows) {
            sightings.add(r.sighting_id);
            magnitudes.push(r.magnitude);
            distances.push(r.distance_km);
            offsets.push(r.hours_offset);

            if (r.magnitude > maxMag) {
                maxMag = r.magnitude;
            }
        }

        return {sightings: sightings, magnitudes: magnitudes, distances: distances, offsets: offsets, maxMag: maxMag};
    }

    /**
     * Collect the finite background environmental series (where surveying
     * happened), used as the denominator for the response curves.
     * @private
     */
    private static _collectBackground(background: EnvBackgroundRow[]): {sst: number[]; chl: number[]; depth: number[]; dist: number[];} {
        const sst: number[] = [];
        const chl: number[] = [];
        const depth: number[] = [];
        const dist: number[] = [];

        for (const b of background) {
            if (b.sst_c_day !== null && Number.isFinite(b.sst_c_day)) {
                sst.push(b.sst_c_day);
            }

            if (b.chl_a_mg_m3_day !== null && Number.isFinite(b.chl_a_mg_m3_day)) {
                chl.push(b.chl_a_mg_m3_day);
            }

            if (b.depth_m !== null && Number.isFinite(b.depth_m)) {
                depth.push(Math.abs(b.depth_m));
            }

            const bd = parseFloat(b.distance_coast ?? '');
            if (Number.isFinite(bd) && bd >= 0) {
                dist.push(bd);
            }
        }

        return {sst: sst, chl: chl, depth: depth, dist: dist};
    }

}