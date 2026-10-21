/**
 * One bin of an environmental response curve: the target species' share of all
 * sightings whose environment falls in [bucket_min, bucket_max), with a Wilson
 * 95 % confidence interval.
 */
export type ResponseBin = {
    bucket_min: number;
    bucket_max: number;
    n_target: number;
    n_total: number;
    proportion: number;
    ci_lo: number;
    ci_hi: number;
};

/**
 * Target-group-background environmental response curves (no free functions —
 * static methods on this class).
 *
 * The raw env histogram shows Σ sightings per environment bin, which conflates
 * "the species likes this value" with "we surveyed more at this value". This
 * replaces the count with the target species' PROPORTION of all sightings in
 * each bin — i.e. presence relative to the surveyed environmental distribution
 * (the target-group background). The background shares the sampling bias, so
 * the proportion is an effort-corrected preference. Each bin carries a Wilson
 * score 95 % CI (good for the small / extreme-proportion bins a normal
 * approximation handles badly).
 */
export class ResponseCurves {

    /**
     * z for a 95 % two-sided interval.
     * @private
     */
    private static readonly Z = 1.96;

    /**
     * Wilson score interval for `k` successes out of `n` trials.
     */
    public static wilson(k: number, n: number): {p: number; lo: number; hi: number;} {
        if (n <= 0) {
            return {p: 0, lo: 0, hi: 0};
        }
        const z = ResponseCurves.Z;
        const z2 = z * z;
        const phat = k / n;
        const denom = 1 + (z2 / n);
        const centre = (phat + (z2 / (2 * n))) / denom;
        const margin = (z * Math.sqrt(((phat * (1 - phat)) / n) + (z2 / (4 * n * n)))) / denom;

        return {
            p: phat,
            lo: Math.max(0, centre - margin),
            hi: Math.min(1, centre + margin)
        };
    }

    /**
     * Build the response curve: bin the target and background values on the
     * same edges the histogram uses (half-open [e_i, e_{i+1}) bins plus an
     * open-ended tail bin ≥ the last edge), then compute the target proportion
     * + Wilson CI per bin. Bins with no background sightings are dropped (the
     * proportion is undefined there).
     */
    public static build(targetValues: number[], backgroundValues: number[], edges: number[]): ResponseBin[] {
        const sortedEdges = [...edges].sort((a, b) => a - b);
        // inner bins + one open tail bin
        const nBins = sortedEdges.length;
        const targetCounts = new Array<number>(nBins).fill(0);
        const totalCounts = new Array<number>(nBins).fill(0);

        for (const v of targetValues) {
            const idx = ResponseCurves._binIndex(v, sortedEdges);
            if (idx >= 0) {
                targetCounts[idx]++;
            }
        }
        for (const v of backgroundValues) {
            const idx = ResponseCurves._binIndex(v, sortedEdges);
            if (idx >= 0) {
                totalCounts[idx]++;
            }
        }

        const out: ResponseBin[] = [];
        for (let i = 0; i < nBins; i++) {
            if (totalCounts[i] === 0) {
                continue;
            }
            const min = sortedEdges[i];
            const max = i < sortedEdges.length - 1 ? sortedEdges[i + 1] : sortedEdges[i];
            const w = ResponseCurves.wilson(targetCounts[i], totalCounts[i]);
            out.push({
                bucket_min: min,
                bucket_max: max,
                n_target: targetCounts[i],
                n_total: totalCounts[i],
                proportion: Math.round(w.p * 10000) / 10000,
                ci_lo: Math.round(w.lo * 10000) / 10000,
                ci_hi: Math.round(w.hi * 10000) / 10000
            });
        }

        return out;
    }

    /**
     * Bin index for a value: the half-open bin [e_i, e_{i+1}) it falls in, or
     * the open tail bin (last index) for values ≥ the last edge. Returns -1 for
     * non-finite values or values below the first edge.
     * @private
     */
    private static _binIndex(value: number, sortedEdges: number[]): number {
        if (!Number.isFinite(value) || value < sortedEdges[0]) {
            return -1;
        }
        for (let i = 0; i < sortedEdges.length - 1; i++) {
            if (value >= sortedEdges[i] && value < sortedEdges[i + 1]) {
                return i;
            }
        }
        return sortedEdges.length - 1;
    }

}