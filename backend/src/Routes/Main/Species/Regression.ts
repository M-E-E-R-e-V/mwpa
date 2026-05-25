import {StatusCodes} from 'figtree-schemas';
import {
    SpeciesRegressionChart,
    SpeciesRegressionFit,
    SpeciesRegressionMatrixResponse,
    SpeciesRegressionPoint,
    SpeciesRegressionRequest,
    SpeciesRegressionSeries
} from 'mwpa_schemas';
import {Vts} from 'vts';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';

/**
 * Internal accumulator shape used while building one chart. Kept here
 * (instead of in mwpa_schemas) because the wire schema is the final
 * output; this is just the in-memory bag we group rows into.
 */
type SeriesAccumulator = {
    species_id: number;
    species_name: string;
    color: string;
    points: SpeciesRegressionPoint[];
};

/**
 * Cross-Species Regression Matrix
 *
 * Builds four scatter-with-regression charts that make Simpson-paradox
 * effects visible: each species gets its own OLS fit, and a pooled fit
 * across all sightings sits next to it. When the two diverge — slopes
 * of different sign, or the pooled line missing the per-species cloud —
 * the user knows aggregation is misleading.
 *
 * All four charts run on the same period + org-scope, so the response
 * is a snapshot from a single transactional moment.
 */
export class Regression {

    /**
     * Minimum number of points a species must have to draw a per-species
     * regression line. Applies after period/org filtering. Below this
     * threshold the species' raw points still appear on the chart (so
     * the pooled line stays honest) but no slope/R² is computed.
     */
    private static readonly DEFAULT_MIN_N = 10;

    /**
     * Top-N species kept per chart for legibility. Sorted by total n
     * desc; the long tail collapses out of the scatter entirely.
     */
    private static readonly TOP_N_SERIES = 8;

    public static async getMatrix(
        request: SpeciesRegressionRequest | undefined,
        organizationIds: number[] | undefined
    ): Promise<SpeciesRegressionMatrixResponse> {
        const req: SpeciesRegressionRequest = Vts.isUndefined(request) ? {} : request;

        const charts: SpeciesRegressionChart[] = [];

        // (1) Year × SPUE — per-species per-year sightings ÷ year-wide
        // tour-hours. Effort-corrected, the headline chart for the page.
        const yearlyRows = await SightingRepository.getInstance().aggregateYearlySpecies(
            req.period_from,
            req.period_to,
            organizationIds
        );
        const yearlyTourHours = await SightingTourRepository.getInstance().aggregateYearlyTourHours(
            req.period_from,
            req.period_to,
            organizationIds
        );

        const yearAccumulators = new Map<number, SeriesAccumulator>();
        for (const r of yearlyRows) {
            const hours = yearlyTourHours.get(r.y) ?? 0;
            if (hours <= 0) {
                continue;
            }
            const spue = r.sightings / hours;
            const acc = Regression._ensureAcc(yearAccumulators, r.species_id, r.species_name, r.color);
            acc.points.push({
                x: parseInt(r.y, 10),
                y: spue,
                label: `${r.species_name} · ${r.y}: ${spue.toFixed(3)} (${r.sightings}/${hours.toFixed(0)} h)`
            });
        }
        charts.push(Regression._finalise(
            'year_spue',
            'Year × SPUE',
            'desc.reg.year_spue',
            'Year',
            'Sightings per tour-hour',
            yearAccumulators
        ));

        // (2) SST × group size — per-sighting scatter, drops rows
        // without an SST value or without species_count.
        const envRows = await SightingRepository.getInstance().findEnvScatterRows(
            req.period_from,
            req.period_to,
            organizationIds
        );

        const sstAccumulators = new Map<number, SeriesAccumulator>();
        for (const r of envRows) {
            if (r.sst_c_day === null || !Number.isFinite(r.sst_c_day)) {
                continue;
            }
            const acc = Regression._ensureAcc(sstAccumulators, r.species_id, r.species_name, r.color);
            acc.points.push({
                x: r.sst_c_day,
                y: r.species_count,
                label: `${r.species_name}: ${r.species_count} @ ${r.sst_c_day.toFixed(1)} °C`
            });
        }
        charts.push(Regression._finalise(
            'sst_groupsize',
            'SST × group size',
            'desc.reg.sst_groupsize',
            'Sea-surface temperature (°C)',
            'Group size (count)',
            sstAccumulators
        ));

        // (3) Chl-a × group size — same shape as (2).
        const chlAccumulators = new Map<number, SeriesAccumulator>();
        for (const r of envRows) {
            if (r.chl_a_mg_m3_day === null || !Number.isFinite(r.chl_a_mg_m3_day)) {
                continue;
            }
            const acc = Regression._ensureAcc(chlAccumulators, r.species_id, r.species_name, r.color);
            acc.points.push({
                x: r.chl_a_mg_m3_day,
                y: r.species_count,
                label: `${r.species_name}: ${r.species_count} @ ${r.chl_a_mg_m3_day.toFixed(2)} mg/m³`
            });
        }
        charts.push(Regression._finalise(
            'chl_groupsize',
            'Chlorophyll-a × group size',
            'desc.reg.chl_groupsize',
            'Chlorophyll-a (mg/m³)',
            'Group size (count)',
            chlAccumulators
        ));

        // (4) Tour-hours × sightings — effort saturation check. One
        // point per (species, month). x = total tour-hours that month
        // (independent of species), y = that species' sightings.
        const monthlyRows = await SightingRepository.getInstance().aggregateMonthlySpecies(
            req.period_from,
            req.period_to,
            organizationIds
        );
        const monthlyTourHours = await SightingTourRepository.getInstance().aggregateMonthlyTourHours(
            req.period_from,
            req.period_to,
            organizationIds
        );

        const effortAccumulators = new Map<number, SeriesAccumulator>();
        for (const r of monthlyRows) {
            const hours = monthlyTourHours.get(r.ym) ?? 0;
            if (hours <= 0) {
                continue;
            }
            const acc = Regression._ensureAcc(effortAccumulators, r.species_id, r.species_name, r.color);
            acc.points.push({
                x: hours,
                y: r.sightings,
                label: `${r.species_name} · ${r.ym}: ${r.sightings} @ ${hours.toFixed(1)} h`
            });
        }
        charts.push(Regression._finalise(
            'effort_saturation',
            'Tour effort × sightings',
            'desc.reg.effort',
            'Tour hours per month',
            'Sightings per month',
            effortAccumulators
        ));

        return {statusCode: StatusCodes.OK, charts: charts};
    }

    private static _ensureAcc(
        map: Map<number, SeriesAccumulator>,
        speciesId: number,
        speciesName: string,
        color: string
    ): SeriesAccumulator {
        let acc = map.get(speciesId);
        if (!acc) {
            acc = {
                species_id: speciesId,
                species_name: speciesName,
                color: color,
                points: []
            };
            map.set(speciesId, acc);
        }
        return acc;
    }

    /**
     * Convert the per-species accumulators into a chart: trim to top-N
     * series by point count, compute per-series fits (when n ≥ min_n),
     * and compute the pooled fit across every point in the chart (top-N
     * only — the long tail is dropped from both points and pooled fit so
     * the visual matches the math the user sees).
     */
    private static _finalise(
        id: string,
        titleKey: string,
        descKey: string,
        xLabelKey: string,
        yLabelKey: string,
        accumulators: Map<number, SeriesAccumulator>
    ): SpeciesRegressionChart {
        const minN = Regression.DEFAULT_MIN_N;
        const allSeries = [...accumulators.values()]
            .sort((a, b) => b.points.length - a.points.length);
        const kept = allSeries.slice(0, Regression.TOP_N_SERIES);

        const series: SpeciesRegressionSeries[] = kept.map((s) => {
            const fit = s.points.length >= minN ? Regression._ols(s.points) : undefined;
            return {
                species_id: s.species_id,
                species_name: s.species_name,
                color: s.color,
                points: s.points,
                fit: fit
            };
        });

        const pooledPoints: SpeciesRegressionPoint[] = [];
        for (const s of kept) {
            for (const p of s.points) {
                pooledPoints.push(p);
            }
        }
        const pooledFit = pooledPoints.length >= minN ? Regression._ols(pooledPoints) : undefined;

        return {
            id: id,
            title_key: titleKey,
            desc_key: descKey,
            x_label_key: xLabelKey,
            y_label_key: yLabelKey,
            min_n_per_series: minN,
            series: series,
            pooled_fit: pooledFit
        };
    }

    /**
     * Ordinary least-squares fit y = slope·x + intercept. R² uses the
     * standard SS_res / SS_tot definition; when SS_tot is 0 (constant y)
     * R² is reported as 0. Skips non-finite inputs.
     */
    private static _ols(points: ReadonlyArray<SpeciesRegressionPoint>): SpeciesRegressionFit {
        let n = 0;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (const p of points) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                continue;
            }
            n++;
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumXX += p.x * p.x;
        }

        if (n < 2) {
            return {slope: 0, intercept: 0, r2: 0, n: n};
        }

        const denom = (n * sumXX) - (sumX * sumX);
        if (denom === 0) {
            return {slope: 0, intercept: sumY / n, r2: 0, n: n};
        }

        const slope = ((n * sumXY) - (sumX * sumY)) / denom;
        const intercept = (sumY - (slope * sumX)) / n;

        const meanY = sumY / n;
        let ssRes = 0;
        let ssTot = 0;
        for (const p of points) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                continue;
            }
            const yhat = (slope * p.x) + intercept;
            ssRes += (p.y - yhat) * (p.y - yhat);
            ssTot += (p.y - meanY) * (p.y - meanY);
        }

        const r2 = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
        return {slope: slope, intercept: intercept, r2: r2, n: n};
    }

}