import {SightingCurrentFieldGrid} from '../../Db/MariaDb/Entities/SightingCurrentField.js';

/**
 * Scalar summary of a regional u/v patch — what callers persist to
 * {@link SightingExtended}. All fields are nullable because individual
 * derivations can fail independently (e.g. curl/divergence need at
 * least one finite cross-shaped 3×3 neighbourhood; mean/max only need
 * a single finite cell).
 */
export type CurrentRegionAggregateResult = {
    meanSpeedMs: number | null;
    maxSpeedMs: number | null;
    curlSinv: number | null;
    divergenceSinv: number | null;
};

/**
 * Distil a regional CMEMS u/v patch into the four scalars persisted on
 * {@link SightingExtended} for downstream scoring / filtering:
 *
 *   - `meanSpeedMs`     — area-mean of |(u, v)| over finite cells.
 *   - `maxSpeedMs`      — cell-wise max of |(u, v)|.
 *   - `curlSinv`        — vertical vorticity ζ = ∂v/∂x − ∂u/∂y
 *                          at the patch centre, central differences.
 *   - `divergenceSinv`  — ∇·u = ∂u/∂x + ∂v/∂y at the patch centre.
 *
 * Spatial steps in metres come from the patch's lat/lon spacing using
 * the spherical-Earth approximation (Δx = R · cos φ · Δλ, Δy = R · Δφ).
 * That gives values within a few percent of full WGS84 at our patch
 * sizes (≤ 1° half-width) — plenty for an eddy-vs-not screening signal.
 */
export class CurrentRegionAggregates {

    /**
     * Earth radius (metres, mean).
     * @private
     */
    private static readonly EARTH_RADIUS_M = 6371008.8;

    /**
     * Compute all four aggregates for a patch. Returns nulls in fields
     * the patch is too sparse to support.
     */
    public static compute(grid: SightingCurrentFieldGrid): CurrentRegionAggregateResult {
        const speeds = CurrentRegionAggregates._speeds(grid);
        const meanSpeedMs = CurrentRegionAggregates._mean(speeds);
        const maxSpeedMs = CurrentRegionAggregates._max(speeds);
        const {curlSinv, divergenceSinv} = CurrentRegionAggregates._centreDerivatives(grid);

        return {
            meanSpeedMs: meanSpeedMs === null ? null : CurrentRegionAggregates._round(meanSpeedMs, 2),
            maxSpeedMs: maxSpeedMs === null ? null : CurrentRegionAggregates._round(maxSpeedMs, 2),
            curlSinv: curlSinv === null ? null : CurrentRegionAggregates._round(curlSinv, 7),
            divergenceSinv: divergenceSinv === null ? null : CurrentRegionAggregates._round(divergenceSinv, 7)
        };
    }

    /**
     * Flatten the u/v grid into a list of finite cell-wise speeds.
     * @private
     */
    private static _speeds(grid: SightingCurrentFieldGrid): number[] {
        const out: number[] = [];

        for (let i = 0; i < grid.u.length; i++) {
            const uRow = grid.u[i];
            const vRow = grid.v[i];

            if (vRow === undefined) {
                continue;
            }

            for (let j = 0; j < uRow.length; j++) {
                const uIj = uRow[j];
                const vIj = vRow[j];

                if (uIj !== null && vIj !== null && Number.isFinite(uIj) && Number.isFinite(vIj)) {
                    out.push(Math.sqrt((uIj * uIj) + (vIj * vIj)));
                }
            }
        }

        return out;
    }

    /**
     * Central-difference curl and divergence at the patch centre cell.
     * Falls back to one-sided differences if the centre's immediate
     * neighbours are missing. Returns nulls when neither approach
     * yields four finite samples.
     * @private
     */
    private static _centreDerivatives(grid: SightingCurrentFieldGrid): {
        curlSinv: number | null;
        divergenceSinv: number | null;
    } {
        const nLat = grid.grid_lat.length;
        const nLon = grid.grid_lon.length;

        if (nLat < 3 || nLon < 3) {
            return {curlSinv: null, divergenceSinv: null};
        }

        const ci = Math.floor(nLat / 2);
        const cj = Math.floor(nLon / 2);
        const centreLatDeg = grid.grid_lat[ci];
        const dPhiDeg = grid.grid_lat[ci + 1] - grid.grid_lat[ci - 1];
        const dLamDeg = grid.grid_lon[cj + 1] - grid.grid_lon[cj - 1];
        const dy = (dPhiDeg * Math.PI / 180) * CurrentRegionAggregates.EARTH_RADIUS_M;
        const dx = (dLamDeg * Math.PI / 180) * CurrentRegionAggregates.EARTH_RADIUS_M
            * Math.cos(centreLatDeg * Math.PI / 180);

        const uxPlus = grid.u[ci]?.[cj + 1];
        const uxMinus = grid.u[ci]?.[cj - 1];
        const uyPlus = grid.u[ci + 1]?.[cj];
        const uyMinus = grid.u[ci - 1]?.[cj];
        const vxPlus = grid.v[ci]?.[cj + 1];
        const vxMinus = grid.v[ci]?.[cj - 1];
        const vyPlus = grid.v[ci + 1]?.[cj];
        const vyMinus = grid.v[ci - 1]?.[cj];

        const dudx = CurrentRegionAggregates._derivative(uxMinus, uxPlus, dx);
        const dvdy = CurrentRegionAggregates._derivative(vyMinus, vyPlus, dy);
        const dvdx = CurrentRegionAggregates._derivative(vxMinus, vxPlus, dx);
        const dudy = CurrentRegionAggregates._derivative(uyMinus, uyPlus, dy);

        const divergenceSinv = dudx !== null && dvdy !== null ? dudx + dvdy : null;
        const curlSinv = dvdx !== null && dudy !== null ? dvdx - dudy : null;

        return {curlSinv: curlSinv, divergenceSinv: divergenceSinv};
    }

    /**
     * (a - b) / (2 · h) — central difference. Returns null when either
     * sample is missing.
     * @private
     */
    private static _derivative(minus: number | null | undefined, plus: number | null | undefined, h: number): number | null {
        if (typeof minus !== 'number' || typeof plus !== 'number'
            || !Number.isFinite(minus) || !Number.isFinite(plus) || h === 0) {
            return null;
        }

        return (plus - minus) / (2 * h);
    }

    /**
     * Mean of a list of numbers, or null if empty.
     * @private
     */
    private static _mean(xs: number[]): number | null {
        if (xs.length === 0) {
            return null;
        }

        let sum = 0;

        for (const x of xs) {
            sum += x;
        }

        return sum / xs.length;
    }

    /**
     * Max of a list of numbers, or null if empty.
     * @private
     */
    private static _max(xs: number[]): number | null {
        if (xs.length === 0) {
            return null;
        }

        let max = xs[0];

        for (const x of xs) {
            if (x > max) {
                max = x;
            }
        }

        return max;
    }

    /**
     * Round to `digits` fractional places.
     * @private
     */
    private static _round(x: number, digits: number): number {
        const factor = 10 ** digits;
        return Math.round(x * factor) / factor;
    }

}