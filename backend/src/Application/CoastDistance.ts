import {CoastlineGeometry} from './CoastlineGeometry.js';

/**
 * CoastDistance
 *
 * Shortest distance from a point to coast lines given as flat
 * `[lat, lon, lat, lon, ...]` lists (the format of coastline_cache.lines).
 * Uses a local equirectangular projection around the point — accurate to
 * well under 1 % within the ~60 km a cached area spans.
 */
export class CoastDistance {

    /**
     * Distance in metres, or null when there are no line segments.
     * @param {number} lat
     * @param {number} lon
     * @param {number[][]} lines
     * @return {number|null}
     */
    public static distanceM(lat: number, lon: number, lines: number[][]): number | null {
        const kx = Math.cos((lat * Math.PI) / 180) * CoastlineGeometry.M_PER_DEG;
        const ky = CoastlineGeometry.M_PER_DEG;
        let best: number | null = null;

        for (const line of lines) {
            for (let i = 0; i + 3 < line.length; i += 2) {
                const ax = (line[i + 1] - lon) * kx;
                const ay = (line[i] - lat) * ky;
                const bx = (line[i + 3] - lon) * kx;
                const by = (line[i + 2] - lat) * ky;
                const d = CoastDistance._segmentToOrigin(ax, ay, bx, by);

                if (best === null || d < best) {
                    best = d;
                }
            }
        }

        return best;
    }

    /**
     * Distance from the origin to the segment a–b.
     * @param {number} ax
     * @param {number} ay
     * @param {number} bx
     * @param {number} by
     * @return {number}
     */
    protected static _segmentToOrigin(ax: number, ay: number, bx: number, by: number): number {
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = (dx * dx) + (dy * dy);
        let t = len2 > 0 ? -((ax * dx) + (ay * dy)) / len2 : 0;

        t = Math.max(0, Math.min(1, t));

        return Math.hypot(ax + (t * dx), ay + (t * dy));
    }

}