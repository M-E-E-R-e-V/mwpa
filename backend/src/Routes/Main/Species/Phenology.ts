/**
 * One month-of-year phenology bin (aggregated across all years).
 */
export type PhenologyBin = {
    month: number;
    sightings: number;
    tour_hours: number;
    spue: number;
};

/**
 * One year of the SPUE trend: the observed effort-corrected rate, the fitted
 * linear trend with its 95 % CI, and the year's mean climate indices (for the
 * optional B4 overlay).
 */
export type TrendPoint = {
    year: number;
    sightings: number;
    tour_hours: number;
    spue: number;
    fit: number;
    ci_lo: number;
    ci_hi: number;
    nao?: number;
    amo?: number;
    oni?: number;
};

/**
 * Phenology + yearly-trend result.
 */
export type PhenologyResult = {
    bins: PhenologyBin[];
    trend: TrendPoint[];
    slope: number;
    intercept: number;
    r2: number;
    n: number;
};

/**
 * One stored climate-index month (TypeORM decimals arrive as strings).
 */
export type ClimateRow = {
    year: number;
    month: number;
    nao: number | string | null;
    amo: number | string | null;
    oni: number | string | null;
};

/**
 * Phenology (seasonality) + yearly trend for the species profile — no free
 * functions, all static on this class.
 *
 * Both are effort-corrected via the monthly tour-hours the profile already
 * aggregates (SPUE = sightings / tour-hours). Phenology collapses the YYYY-MM
 * series to a 12-month-of-year cycle (the seasonal signal, independent of
 * which years were busier); the trend is an ordinary-least-squares line over
 * per-year SPUE with a mean-response 95 % CI band, plus each year's mean
 * climate index for overlay. The OLS line is a transparent linear trend, not a
 * GAM — honest for the modest per-species year counts here.
 */
export class Phenology {

    /**
     * z for the 95 % band.
     * @private
     */
    private static readonly Z = 1.96;

    public static build(
        monthlySightings: Map<string, number>,
        yearlyCounts: Map<string, number>,
        tourHours: Map<string, number>,
        climate: ClimateRow[]
    ): PhenologyResult {
        const bins = Phenology._phenologyBins(monthlySightings, tourHours);
        const climateByYear = Phenology._climateYearly(climate);

        // Per-year SPUE from sightings / tour-hours; only years with effort.
        const yearHours = new Map<number, number>();
        for (const [ym, hours] of tourHours) {
            const y = parseInt(ym.slice(0, 4), 10);
            if (Number.isInteger(y)) {
                yearHours.set(y, (yearHours.get(y) ?? 0) + hours);
            }
        }

        const raw: {year: number; sightings: number; hours: number; spue: number;}[] = [];
        for (const [ys, count] of yearlyCounts) {
            const year = parseInt(ys, 10);
            const hours = yearHours.get(year) ?? 0;
            if (!Number.isInteger(year) || hours <= 0) {
                continue;
            }
            raw.push({year: year, sightings: count, hours: hours, spue: count / hours});
        }
        raw.sort((a, b) => a.year - b.year);

        const fit = Phenology._ols(raw.map((r) => r.year), raw.map((r) => r.spue));

        const trend: TrendPoint[] = raw.map((r) => {
            const band = Phenology._meanResponseBand(r.year, raw.map((p) => p.year), raw.map((p) => p.spue), fit);
            const clim = climateByYear.get(r.year);
            return {
                year: r.year,
                sightings: r.sightings,
                tour_hours: Math.round(r.hours * 10) / 10,
                spue: Math.round(r.spue * 10000) / 10000,
                fit: Math.round(band.fit * 10000) / 10000,
                ci_lo: Math.round(band.lo * 10000) / 10000,
                ci_hi: Math.round(band.hi * 10000) / 10000,
                nao: clim?.nao,
                amo: clim?.amo,
                oni: clim?.oni
            };
        });

        return {
            bins: bins,
            trend: trend,
            slope: Math.round(fit.slope * 1e6) / 1e6,
            intercept: Math.round(fit.intercept * 1e6) / 1e6,
            r2: Math.round(fit.r2 * 1000) / 1000,
            n: raw.length
        };
    }

    /**
     * 12 month-of-year bins: sightings + tour-hours summed over all years, SPUE.
     * @private
     */
    private static _phenologyBins(
        monthlySightings: Map<string, number>,
        tourHours: Map<string, number>
    ): PhenologyBin[] {
        const sByMonth = new Array<number>(13).fill(0);
        const hByMonth = new Array<number>(13).fill(0);

        for (const [ym, count] of monthlySightings) {
            const m = parseInt(ym.slice(5, 7), 10);
            if (m >= 1 && m <= 12) {
                sByMonth[m] += count;
            }
        }
        for (const [ym, hours] of tourHours) {
            const m = parseInt(ym.slice(5, 7), 10);
            if (m >= 1 && m <= 12) {
                hByMonth[m] += hours;
            }
        }

        const bins: PhenologyBin[] = [];
        for (let m = 1; m <= 12; m++) {
            const hours = hByMonth[m];
            bins.push({
                month: m,
                sightings: sByMonth[m],
                tour_hours: Math.round(hours * 10) / 10,
                spue: hours > 0 ? Math.round((sByMonth[m] / hours) * 10000) / 10000 : 0
            });
        }
        return bins;
    }

    /**
     * Mean climate index per year (average of the available months).
     * @private
     */
    private static _climateYearly(climate: ClimateRow[]): Map<number, {nao?: number; amo?: number; oni?: number;}> {
        const acc = new Map<number, {nao: number[]; amo: number[]; oni: number[];}>();
        const push = (arr: number[], v: number | string | null): void => {
            if (v !== null) {
                const n = Number(v);
                if (Number.isFinite(n)) {
                    arr.push(n);
                }
            }
        };
        for (const c of climate) {
            const e = acc.get(c.year) ?? {nao: [], amo: [], oni: []};
            push(e.nao, c.nao);
            push(e.amo, c.amo);
            push(e.oni, c.oni);
            acc.set(c.year, e);
        }

        const mean = (xs: number[]): number | undefined =>
            xs.length === 0 ? undefined : Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 1000) / 1000;

        const out = new Map<number, {nao?: number; amo?: number; oni?: number;}>();
        for (const [year, e] of acc) {
            out.set(year, {nao: mean(e.nao), amo: mean(e.amo), oni: mean(e.oni)});
        }
        return out;
    }

    /**
     * Ordinary-least-squares fit of y on x.
     * @private
     */
    private static _ols(xs: number[], ys: number[]): {slope: number; intercept: number; r2: number;} {
        const n = xs.length;
        if (n < 2) {
            return {slope: 0, intercept: n === 1 ? ys[0] : 0, r2: 0};
        }
        const meanX = xs.reduce((s, x) => s + x, 0) / n;
        const meanY = ys.reduce((s, y) => s + y, 0) / n;
        let sxy = 0;
        let sxx = 0;
        let syy = 0;
        for (let i = 0; i < n; i++) {
            const dx = xs[i] - meanX;
            const dy = ys[i] - meanY;
            sxy += dx * dy;
            sxx += dx * dx;
            syy += dy * dy;
        }
        if (sxx === 0) {
            return {slope: 0, intercept: meanY, r2: 0};
        }
        const slope = sxy / sxx;
        const intercept = meanY - (slope * meanX);
        const r2 = syy === 0 ? 0 : Math.max(0, 1 - (((syy - ((sxy * sxy) / sxx))) / syy));
        return {slope: slope, intercept: intercept, r2: r2};
    }

    /**
     * Mean-response 95 % CI of the fitted line at `x0`:
     * fit ± z·s·sqrt(1/n + (x0−x̄)²/Sxx), s = sqrt(SS_res/(n−2)). Collapses to
     * the point estimate when n ≤ 2 or the x's are all equal.
     * @private
     */
    private static _meanResponseBand(
        x0: number,
        xs: number[],
        ys: number[],
        fit: {slope: number; intercept: number;}
    ): {fit: number; lo: number; hi: number;} {
        const yhat = (fit.slope * x0) + fit.intercept;
        const n = xs.length;
        if (n <= 2) {
            return {fit: yhat, lo: yhat, hi: yhat};
        }
        const meanX = xs.reduce((s, x) => s + x, 0) / n;
        let ssRes = 0;
        let sxx = 0;
        for (let i = 0; i < n; i++) {
            const resid = ys[i] - ((fit.slope * xs[i]) + fit.intercept);
            ssRes += resid * resid;
            sxx += (xs[i] - meanX) ** 2;
        }
        if (sxx === 0) {
            return {fit: yhat, lo: yhat, hi: yhat};
        }
        const s = Math.sqrt(ssRes / (n - 2));
        const seFit = s * Math.sqrt((1 / n) + (((x0 - meanX) ** 2) / sxx));
        const margin = Phenology.Z * seFit;
        return {fit: yhat, lo: Math.max(0, yhat - margin), hi: yhat + margin};
    }

}