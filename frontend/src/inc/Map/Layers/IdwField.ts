/**
 * A projected, weighted sample point in the IDW field (map-projection units).
 */
export type IdwPoint = {
    x: number;
    y: number;
    v: number;
};

/**
 * IdwField
 *
 * Inverse-distance-weighted (power 2) interpolation over a fixed point set.
 * Constructed once per paint; {@link valueAt} is then called per sample pixel.
 * The K-nearest search buffers are owned by the instance so the hot loop stays
 * allocation-free. Pure (DOM-free) so the math is unit-testable in isolation.
 */
export class IdwField {

    /**
     * @private
     */
    private readonly _points: IdwPoint[];

    /**
     * @private
     */
    private readonly _radiusSq: number;

    /**
     * @private
     */
    private readonly _k: number;

    /**
     * Squared distance of each retained neighbour (length k+1).
     * @private
     */
    private readonly _d2: number[];

    /**
     * Value of each retained neighbour (length k+1).
     * @private
     */
    private readonly _nv: number[];

    /**
     * Neighbours retained for the current query.
     * @private
     */
    private _filled: number = 0;

    /**
     * Index of the currently-worst (farthest) retained neighbour.
     * @private
     */
    private _worstIdx: number = 0;

    /**
     * Squared distance of the currently-worst retained neighbour.
     * @private
     */
    private _worstD2: number = Number.POSITIVE_INFINITY;

    /**
     * @param {IdwPoint[]} points
     * @param {number} radiusSq squared influence radius
     * @param {number} k maximum neighbours to average
     */
    public constructor(points: IdwPoint[], radiusSq: number, k: number) {
        this._points = points;
        this._radiusSq = radiusSq;
        this._k = k;
        this._d2 = new Array<number>(k + 1).fill(Number.POSITIVE_INFINITY);
        this._nv = new Array<number>(k + 1).fill(0);
    }

    /**
     * valueAt — the interpolated value at (qx, qy): the exact value on a direct
     * hit, or null when no point is within the influence radius.
     * @param {number} qx
     * @param {number} qy
     * @returns {number|null}
     */
    public valueAt(qx: number, qy: number): number|null {
        this._filled = 0;
        this._worstIdx = 0;
        this._worstD2 = Number.POSITIVE_INFINITY;

        for (const p of this._points) {
            const dx = p.x - qx;
            const dy = p.y - qy;
            this._consider((dx * dx) + (dy * dy), p.v);
        }

        return this._weighted();
    }

    /**
     * _consider — offer one point (by squared distance + value) to the bounded
     * K-nearest set, keeping only the k closest.
     * @param {number} d2
     * @param {number} v
     * @private
     */
    private _consider(d2: number, v: number): void {
        if (d2 > this._radiusSq) {
            return;
        }

        if (this._filled < this._k) {
            this._d2[this._filled] = d2;
            this._nv[this._filled] = v;
            this._filled++;

            if (this._filled === this._k) {
                this._recomputeWorst();
            }

            return;
        }

        if (d2 < this._worstD2) {
            this._d2[this._worstIdx] = d2;
            this._nv[this._worstIdx] = v;
            this._recomputeWorst();
        }
    }

    /**
     * _recomputeWorst — refresh the farthest retained neighbour after an insert.
     * @private
     */
    private _recomputeWorst(): void {
        let idx = 0;
        let worst = this._d2[0];

        for (let j = 1; j < this._k; j++) {
            if (this._d2[j] > worst) {
                worst = this._d2[j];
                idx = j;
            }
        }

        this._worstIdx = idx;
        this._worstD2 = worst;
    }

    /**
     * _weighted — the power-2 inverse-distance weighted mean of the retained
     * neighbours (or the exact value on a direct hit; null when none).
     * @returns {number|null}
     * @private
     */
    private _weighted(): number|null {
        if (this._filled === 0) {
            return null;
        }

        let num = 0;
        let den = 0;

        for (let j = 0; j < this._filled; j++) {
            if (this._d2[j] === 0) {
                return this._nv[j];
            }

            const wt = 1 / this._d2[j];
            num += this._nv[j] * wt;
            den += wt;
        }

        return num / den;
    }

}