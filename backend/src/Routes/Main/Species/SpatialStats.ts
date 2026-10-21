/**
 * One grid cell of the spatial analysis. `lon`/`lat` are the cell CENTRE.
 */
export type SpatialCell = {
    lon: number;
    lat: number;
    density: number;
    ud_level: number;
    gi_z?: number;
};

/**
 * Result of {@link SpatialStats.compute}: a regular lon/lat grid over the
 * sightings' bounding box plus the kernel density, utilisation-distribution
 * isopleth level and Getis-Ord Gi* z-score per cell.
 */
export type SpatialResult = {
    n_points: number;
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
    nx: number;
    ny: number;
    cell_lon_deg: number;
    cell_lat_deg: number;
    bandwidth_km: number;
    cells: SpatialCell[];
};

/**
 * One weighted point fed into {@link SpatialStats.compute}.
 */
export type SpatialPoint = {lon: number; lat: number; weight: number;};

/**
 * Spatial-statistics helper for the species profile (no free functions — all
 * static methods on this class).
 *
 * Produces, server-side, a kernel-density utilisation distribution (UD) with
 * 50 % (core) / 95 % (home-range) isopleths and a Getis-Ord Gi* hotspot
 * z-score, from the per-sighting positions. The frontend only renders the
 * returned grid — identical numbers between web, PDF and any other consumer.
 */
export class SpatialStats {

    /**
     * Target number of cells on the grid's longer axis.
     * @private
     */
    private static readonly GRID_N = 48;

    /**
     * Below this many positioned sightings the estimate is not worth showing.
     * @private
     */
    private static readonly MIN_POINTS = 10;

    /**
     * Gi* neighbourhood radius in cells (Chebyshev / king move). r=2 → a 5×5
     * window including the focal cell.
     * @private
     */
    private static readonly GI_RADIUS_CELLS = 2;

    /**
     * km per degree of latitude (mean).
     * @private
     */
    private static readonly KM_PER_DEG_LAT = 110.574;

    public static compute(points: SpatialPoint[]): SpatialResult | null {
        if (points.length < SpatialStats.MIN_POINTS) {
            return null;
        }

        const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
        const kmPerDegLon = 111.320 * Math.cos((meanLat * Math.PI) / 180);
        const kmPerDegLat = SpatialStats.KM_PER_DEG_LAT;

        // Spread (km) per axis for the Silverman bandwidth.
        const sdLonDeg = SpatialStats._std(points.map((p) => p.lon));
        const sdLatDeg = SpatialStats._std(points.map((p) => p.lat));
        const sdLonKm = sdLonDeg * kmPerDegLon;
        const sdLatKm = sdLatDeg * kmPerDegLat;
        const sigmaKm = Math.sqrt(((sdLonKm * sdLonKm) + (sdLatKm * sdLatKm)) / 2);
        // Silverman 2-D rule of thumb, with a 1 km floor so a single tight
        // cluster still gets a visible kernel.
        const bandwidthKm = Math.max(1, sigmaKm * (points.length ** (-1 / 6)));

        // Bounding box padded by 2 bandwidths so the kernel tails aren't clipped.
        const padLon = (2 * bandwidthKm) / kmPerDegLon;
        const padLat = (2 * bandwidthKm) / kmPerDegLat;
        let minLon = Math.min(...points.map((p) => p.lon)) - padLon;
        let maxLon = Math.max(...points.map((p) => p.lon)) + padLon;
        let minLat = Math.min(...points.map((p) => p.lat)) - padLat;
        let maxLat = Math.max(...points.map((p) => p.lat)) + padLat;

        // Degenerate (all points identical) — give the box a minimum span.
        if (maxLon - minLon < 1e-6) {
            minLon -= 0.05;
            maxLon += 0.05;
        }
        if (maxLat - minLat < 1e-6) {
            minLat -= 0.05;
            maxLat += 0.05;
        }

        const spanLonKm = (maxLon - minLon) * kmPerDegLon;
        const spanLatKm = (maxLat - minLat) * kmPerDegLat;
        const longer = Math.max(spanLonKm, spanLatKm);
        const nx = Math.max(4, Math.round(SpatialStats.GRID_N * (spanLonKm / longer)));
        const ny = Math.max(4, Math.round(SpatialStats.GRID_N * (spanLatKm / longer)));

        const cellLonDeg = (maxLon - minLon) / nx;
        const cellLatDeg = (maxLat - minLat) / ny;
        const cellAreaKm2 = (cellLonDeg * kmPerDegLon) * (cellLatDeg * kmPerDegLat);

        // Project points to km once (relative to the box origin).
        const px: number[] = [];
        const py: number[] = [];
        const pw: number[] = [];
        for (const p of points) {
            px.push((p.lon - minLon) * kmPerDegLon);
            py.push((p.lat - minLat) * kmPerDegLat);
            pw.push(p.weight > 0 ? p.weight : 1);
        }

        const nCells = nx * ny;
        const density = new Array<number>(nCells).fill(0);
        const count = new Array<number>(nCells).fill(0);
        const twoH2 = 2 * bandwidthKm * bandwidthKm;

        for (let iy = 0; iy < ny; iy++) {
            const cyKm = (iy + 0.5) * cellLatDeg * kmPerDegLat;
            for (let ix = 0; ix < nx; ix++) {
                const cxKm = (ix + 0.5) * cellLonDeg * kmPerDegLon;
                let d = 0;
                for (let k = 0; k < px.length; k++) {
                    const dx = cxKm - px[k];
                    const dy = cyKm - py[k];
                    d += pw[k] * Math.exp(-((dx * dx) + (dy * dy)) / twoH2);
                }
                density[(iy * nx) + ix] = d;
            }
        }

        // Point counts per cell (for Gi*).
        for (let k = 0; k < px.length; k++) {
            const ix = Math.min(nx - 1, Math.floor(px[k] / (cellLonDeg * kmPerDegLon)));
            const iy = Math.min(ny - 1, Math.floor(py[k] / (cellLatDeg * kmPerDegLat)));
            count[(iy * nx) + ix] += pw[k];
        }

        SpatialStats._normalise(density, cellAreaKm2);
        const udLevel = SpatialStats._udLevels(density, cellAreaKm2);
        const giZ = SpatialStats._getisOrd(count, nx, ny);

        const cells: SpatialCell[] = [];
        for (let iy = 0; iy < ny; iy++) {
            for (let ix = 0; ix < nx; ix++) {
                const idx = (iy * nx) + ix;
                const z = giZ[idx];
                // Keep only the meaningful cells: inside the 95 % UD, or a
                // (near-)significant Gi* hot/cold spot. Keeps the payload small.
                if (udLevel[idx] === 0 && (z === null || Math.abs(z) < 1.0)) {
                    continue;
                }
                cells.push({
                    lon: minLon + ((ix + 0.5) * cellLonDeg),
                    lat: minLat + ((iy + 0.5) * cellLatDeg),
                    density: Math.round(density[idx] * 1e6) / 1e6,
                    ud_level: udLevel[idx],
                    gi_z: z === null ? undefined : Math.round(z * 100) / 100
                });
            }
        }

        return {
            n_points: points.length,
            min_lon: minLon,
            min_lat: minLat,
            max_lon: maxLon,
            max_lat: maxLat,
            nx: nx,
            ny: ny,
            cell_lon_deg: cellLonDeg,
            cell_lat_deg: cellLatDeg,
            bandwidth_km: Math.round(bandwidthKm * 100) / 100,
            cells: cells
        };
    }

    /**
     * Population standard deviation of a numeric array.
     * @private
     */
    private static _std(xs: number[]): number {
        const n = xs.length;
        if (n === 0) {
            return 0;
        }
        const mean = xs.reduce((s, x) => s + x, 0) / n;
        const variance = xs.reduce((s, x) => s + ((x - mean) ** 2), 0) / n;
        return Math.sqrt(variance);
    }

    /**
     * Normalise the density grid to a probability surface (Σ density·area = 1).
     * @private
     */
    private static _normalise(density: number[], cellAreaKm2: number): void {
        let total = 0;
        for (const d of density) {
            total += d;
        }
        const mass = total * cellAreaKm2;
        if (mass <= 0) {
            return;
        }
        for (let i = 0; i < density.length; i++) {
            density[i] /= mass;
        }
    }

    /**
     * Volume-contour UD levels: sort cells by density desc, accumulate their
     * probability mass, and tag the cells enclosing the first 50 % (level 2 =
     * core) and 95 % (level 1 = home range); the rest are level 0.
     * @private
     */
    private static _udLevels(density: number[], cellAreaKm2: number): number[] {
        const order = density.map((d, i) => ({d: d, i: i})).sort((a, b) => b.d - a.d);
        const level = new Array<number>(density.length).fill(0);

        let cum = 0;
        for (const {d, i} of order) {
            cum += d * cellAreaKm2;
            if (cum <= 0.5) {
                level[i] = 2;
            } else if (cum <= 0.95) {
                level[i] = 1;
            } else {
                break;
            }
        }
        return level;
    }

    /**
     * Getis-Ord Gi* z-score per cell over the count lattice, using a
     * fixed-radius (Chebyshev {@link GI_RADIUS_CELLS}) binary neighbourhood
     * that includes the focal cell. Returns null for every cell when the
     * counts have no variance.
     * @private
     */
    private static _getisOrd(count: number[], nx: number, ny: number): (number | null)[] {
        const n = count.length;
        const out = new Array<number | null>(n).fill(null);

        let sum = 0;
        let sumSq = 0;
        for (const c of count) {
            sum += c;
            sumSq += c * c;
        }
        const mean = sum / n;
        const variance = (sumSq / n) - (mean * mean);
        if (variance <= 0) {
            return out;
        }
        const s = Math.sqrt(variance);
        const r = SpatialStats.GI_RADIUS_CELLS;

        for (let iy = 0; iy < ny; iy++) {
            for (let ix = 0; ix < nx; ix++) {
                let wSum = 0;
                let wx = 0;
                for (let jy = Math.max(0, iy - r); jy <= Math.min(ny - 1, iy + r); jy++) {
                    for (let jx = Math.max(0, ix - r); jx <= Math.min(nx - 1, ix + r); jx++) {
                        wSum += 1;
                        wx += count[(jy * nx) + jx];
                    }
                }
                const numerator = wx - (mean * wSum);
                const denominator = s * Math.sqrt(((n * wSum) - (wSum * wSum)) / (n - 1));
                out[(iy * nx) + ix] = denominator === 0 ? null : numerator / denominator;
            }
        }

        return out;
    }

}