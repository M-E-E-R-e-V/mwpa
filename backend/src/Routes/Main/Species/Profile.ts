import {StatusCodes} from 'figtree-schemas';
import {
    SpeciesProfile as SpeciesProfileData,
    SpeciesProfileBucket,
    SpeciesProfileCategoryShare,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileMovement,
    SpeciesProfileRequest,
    SpeciesProfileResponse
} from 'mwpa_schemas';
import {Vts} from 'vts';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * Row shape returned by SightingRepository.findForSpeciesProfile. Declared
 * at module level because it's the value-bag the repository hands back;
 * not a function (the project rules forbid free functions but types are fine).
 */
export type SightingProfileRow = {
    id: number;
    date: string;
    tour_start: string;
    species_count: number;
    juveniles: number;
    calves: number;
    newborns: number;
    distance_coast: string;
    behaviours: string;
    reaction_id: number;
    location_begin: string;
    depth_m: number | null;
    sst_c_day: number | null;
    chl_a_mg_m3_day: number | null;
    avg_speed_mps: number | null;
    max_speed_mps: number | null;
    total_distance_m: number | null;
    dominant_heading_deg: number | null;
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

        const profile: SpeciesProfileData = Profile._aggregate(
            species.id,
            species.name,
            rows,
            request,
            behById,
            reactionById
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
            let placed = false;
            for (let i = 0; i < buckets.length - 1; i++) {
                if (v >= buckets[i].bucket_min && v < buckets[i].bucket_max) {
                    buckets[i].count++;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                buckets[buckets.length - 1].count++;
            }
        }

        if (observedMax > tailMax) {
            buckets[buckets.length - 1].bucket_max = Math.ceil(observedMax + 1);
        }

        return buckets;
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

    private static _aggregate(
        speciesId: number,
        speciesName: string,
        rows: SightingProfileRow[],
        request: SpeciesProfileRequest,
        behById: Map<number, string>,
        reactionById: Map<number, string>
    ): SpeciesProfileData {
        const monthly = new Map<string, number>();
        const hourly = new Array<number>(24).fill(0);
        const groupSizes: number[] = [];
        let totalCount = 0;
        let withJuv = 0;
        let withCalves = 0;
        let withNewborns = 0;

        const distanceCoast: number[] = [];
        const depth: number[] = [];
        const sst: number[] = [];
        const chl: number[] = [];

        const behaviourCounts = new Map<string, number>();
        const reactionCounts = new Map<string, number>();

        const avgSpeed: number[] = [];
        const maxSpeed: number[] = [];
        const totalDist: number[] = [];
        let nWithMovement = 0;
        const headingRose = Profile._emptyHeadingRose();

        const heatmap: SpeciesProfileHeatmapPoint[] = [];

        let dataMinDate = '';
        let dataMaxDate = '';

        for (const r of rows) {
            // Monthly bucket — date is YYYY-MM-DD.
            const ym = (r.date ?? '').substring(0, 7);
            if (ym.length === 7) {
                monthly.set(ym, (monthly.get(ym) ?? 0) + 1);
            }

            // Hourly bucket — tour_start is HH:mm[:ss].
            const hm = (r.tour_start ?? '').match(/^(\d{1,2}):/u);
            if (hm) {
                const h = parseInt(hm[1], 10);
                if (h >= 0 && h < 24) {
                    hourly[h]++;
                }
            }

            const c = Number(r.species_count) || 0;
            groupSizes.push(c);
            totalCount += c;

            if ((Number(r.juveniles) || 0) > 0) {
                withJuv++;
            }
            if ((Number(r.calves) || 0) > 0) {
                withCalves++;
            }
            if ((Number(r.newborns) || 0) > 0) {
                withNewborns++;
            }

            const distMeters = parseFloat(r.distance_coast ?? '');
            if (Number.isFinite(distMeters) && distMeters >= 0) {
                distanceCoast.push(distMeters);
            }

            if (r.depth_m !== null && r.depth_m !== undefined && Number.isFinite(r.depth_m)) {
                depth.push(Math.abs(r.depth_m));
            }
            if (r.sst_c_day !== null && r.sst_c_day !== undefined && Number.isFinite(r.sst_c_day)) {
                sst.push(r.sst_c_day);
            }
            if (r.chl_a_mg_m3_day !== null && r.chl_a_mg_m3_day !== undefined && Number.isFinite(r.chl_a_mg_m3_day)) {
                chl.push(r.chl_a_mg_m3_day);
            }

            // Behaviour mix — multi-value column (JSON map of stringified ids).
            for (const label of Profile._parseBehaviourLabels(r.behaviours, behById)) {
                behaviourCounts.set(label, (behaviourCounts.get(label) ?? 0) + 1);
            }

            // Reaction — single foreign key into EncounterCategories.
            if (r.reaction_id > 0) {
                const rname = reactionById.get(r.reaction_id);
                if (rname) {
                    reactionCounts.set(rname, (reactionCounts.get(rname) ?? 0) + 1);
                }
            }

            // Movement — only present when a SightingMovement row was derived.
            if (r.avg_speed_mps !== null && r.avg_speed_mps !== undefined && Number.isFinite(r.avg_speed_mps)) {
                avgSpeed.push(r.avg_speed_mps * 1.9438);
                nWithMovement++;
            }
            if (r.max_speed_mps !== null && r.max_speed_mps !== undefined && Number.isFinite(r.max_speed_mps)) {
                maxSpeed.push(r.max_speed_mps * 1.9438);
            }
            if (r.total_distance_m !== null && r.total_distance_m !== undefined && Number.isFinite(r.total_distance_m)) {
                totalDist.push(r.total_distance_m);
            }
            if (r.dominant_heading_deg !== null && r.dominant_heading_deg !== undefined && Number.isFinite(r.dominant_heading_deg)) {
                const idx = Profile._headingBinIndex(r.dominant_heading_deg);
                if (idx >= 0 && idx < headingRose.length) {
                    headingRose[idx].count++;
                }
            }

            // Heatmap — cap to avoid huge payloads.
            if (heatmap.length < Profile.HEATMAP_MAX_POINTS) {
                const pos = Profile._parsePositionLonLat(r.location_begin);
                if (pos) {
                    heatmap.push({lon: pos.lon, lat: pos.lat, count: c});
                }
            }

            if (r.date && (dataMinDate === '' || r.date < dataMinDate)) {
                dataMinDate = r.date;
            }
            if (r.date && r.date > dataMaxDate) {
                dataMaxDate = r.date;
            }
        }

        const movement: SpeciesProfileMovement = {
            n_with_movement: nWithMovement,
            median_avg_speed_kt: Profile._percentile(avgSpeed, 50),
            median_max_speed_kt: Profile._percentile(maxSpeed, 50),
            median_total_distance_m: Profile._percentile(totalDist, 50),
            heading_rose: headingRose
        };

        return {
            species_id: speciesId,
            species_name: speciesName,
            period_from: request.period_from ?? dataMinDate,
            period_to: request.period_to ?? dataMaxDate,
            n_sightings: rows.length,
            group_size_total: totalCount,
            group_size_p50: Profile._percentile(groupSizes, 50),
            group_size_p95: Profile._percentile(groupSizes, 95),
            monthly: [...monthly.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ym, count]) => ({ym, count})),
            hourly: hourly.map((count, hour) => ({hour, count})),
            group_size: Profile._bucketize(groupSizes, Profile.GROUP_SIZE_EDGES),
            group_ratios: {
                with_juveniles: withJuv,
                with_calves: withCalves,
                with_newborns: withNewborns,
                total: rows.length
            },
            env: {
                distance_coast_m: Profile._bucketize(distanceCoast, Profile.DISTANCE_COAST_EDGES_M),
                depth_m: Profile._bucketize(depth, Profile.DEPTH_EDGES_M),
                sst_c: Profile._bucketize(sst, Profile.SST_EDGES_C),
                chl_a_mg_m3: Profile._bucketize(chl, Profile.CHL_EDGES_MG_M3)
            },
            behaviour_mix: Profile._topShares(behaviourCounts),
            reaction_mix: Profile._topShares(reactionCounts),
            movement: movement,
            heatmap: heatmap
        };
    }

}