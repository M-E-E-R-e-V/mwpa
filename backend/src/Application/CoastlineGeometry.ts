/**
 * Box in degrees.
 */
export type CoastBbox = {
    south: number;
    west: number;
    north: number;
    east: number;
};

/**
 * Point as [lat, lon] in degrees.
 */
export type LatLon = [number, number];

/**
 * CoastlineGeometry - pure helpers for the coast lines of /mobile/coastline:
 * the box around an area, clipping and simplifying the OpenStreetMap ways.
 * No DB or network access.
 */
export class CoastlineGeometry {

    /**
     * Margin around the area: the nearest coast of a sighting at the edge of
     * the home area can lie outside of it (other islands, the mainland).
     */
    public static readonly MARGIN_M = 60000;

    /**
     * Douglas-Peucker tolerance; below the GPS accuracy at sea and the two
     * decimals (18 m) the app shows in nautical miles.
     */
    public static readonly TOLERANCE_M = 25;

    /**
     * Largest box side (degrees) that is loaded; a bigger home area is
     * refused instead of putting a huge query on the Overpass server.
     */
    public static readonly MAX_SPAN_DEG = 6;

    /**
     * Cell size (degrees) for devices of an organization without home area.
     */
    public static readonly CELL_DEG = 0.5;

    public static readonly M_PER_DEG = 111320;

    /**
     * Box of a ring of [lon, lat] pairs (GeoJSON order) plus marginM.
     */
    public static bboxOfRing(ring: number[][], marginM: number): CoastBbox | null {
        const points = ring.filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));

        if (points.length === 0) {
            return null;
        }

        const lats = points.map((p) => p[1]);
        const lons = points.map((p) => p[0]);

        return CoastlineGeometry.expand({
            south: Math.min(...lats),
            west: Math.min(...lons),
            north: Math.max(...lats),
            east: Math.max(...lons)
        }, marginM);
    }

    /**
     * Cell of a position (CELL_DEG grid) plus marginM and its key; the same
     * cell for all devices nearby, so the server loads it once.
     */
    public static cellOf(lat: number, lon: number, marginM: number): {key: string; bbox: CoastBbox} | null {
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) {
            return null;
        }

        const size = CoastlineGeometry.CELL_DEG;
        const south = Math.floor(lat / size) * size;
        const west = Math.floor(lon / size) * size;

        return {
            key: `cell:${south.toFixed(1)}:${west.toFixed(1)}`,
            bbox: CoastlineGeometry.expand({
                south: south,
                west: west,
                north: south + size,
                east: west + size
            }, marginM)
        };
    }

    /**
     * Box grown by marginM on every side.
     */
    public static expand(bbox: CoastBbox, marginM: number): CoastBbox {
        const dLat = marginM / CoastlineGeometry.M_PER_DEG;
        const midLat = (bbox.south + bbox.north) / 2;
        const dLon = marginM / (CoastlineGeometry.M_PER_DEG * Math.max(0.1, Math.cos(midLat * Math.PI / 180)));
        const r = (v: number): number => Math.round(v * 10000) / 10000;

        return {
            south: r(Math.max(-90, bbox.south - dLat)),
            west: r(Math.max(-180, bbox.west - dLon)),
            north: r(Math.min(90, bbox.north + dLat)),
            east: r(Math.min(180, bbox.east + dLon))
        };
    }

    /**
     * Box small enough to load.
     */
    public static isLoadable(bbox: CoastBbox): boolean {
        return bbox.north > bbox.south && bbox.east > bbox.west &&
            bbox.north - bbox.south <= CoastlineGeometry.MAX_SPAN_DEG &&
            bbox.east - bbox.west <= CoastlineGeometry.MAX_SPAN_DEG;
    }

    public static contains(bbox: CoastBbox, p: LatLon): boolean {
        return p[0] >= bbox.south && p[0] <= bbox.north && p[1] >= bbox.west && p[1] <= bbox.east;
    }

    /**
     * Parts of a way inside the box: runs of points inside, each extended by
     * the neighbour outside so the line reaches the edge.
     */
    public static clip(way: LatLon[], bbox: CoastBbox): LatLon[][] {
        const parts: LatLon[][] = [];
        let current: LatLon[] = [];

        for (let i = 0; i < way.length; i++) {
            const inside = CoastlineGeometry.contains(bbox, way[i]);
            const prevInside = i > 0 && CoastlineGeometry.contains(bbox, way[i - 1]);
            const nextInside = i < way.length - 1 && CoastlineGeometry.contains(bbox, way[i + 1]);

            if (inside || prevInside || nextInside) {
                current.push(way[i]);
            } else if (current.length > 0) {
                parts.push(current);
                current = [];
            }
        }

        if (current.length > 0) {
            parts.push(current);
        }

        return parts.filter((p) => p.length >= 2);
    }

    /**
     * Douglas-Peucker in a local metric projection.
     */
    public static simplify(points: LatLon[], toleranceM: number): LatLon[] {
        if (points.length <= 2) {
            return points;
        }

        const cosLat = Math.cos(points[0][0] * Math.PI / 180);
        const xy = points.map((p): [number, number] => [
            p[1] * CoastlineGeometry.M_PER_DEG * cosLat,
            p[0] * CoastlineGeometry.M_PER_DEG
        ]);
        const keep = new Array<boolean>(points.length).fill(false);
        keep[0] = true;
        keep[points.length - 1] = true;

        const stack: [number, number][] = [[0, points.length - 1]];

        while (stack.length > 0) {
            const [i, j] = stack.pop()!;
            let best = -1;
            let bestK = 0;

            for (let k = i + 1; k < j; k++) {
                const d = CoastlineGeometry.segmentDistance(xy[k], xy[i], xy[j]);

                if (d > best) {
                    best = d;
                    bestK = k;
                }
            }

            if (best > toleranceM) {
                keep[bestK] = true;
                stack.push([i, bestK], [bestK, j]);
            }
        }

        return points.filter((_p, idx) => keep[idx]);
    }

    /**
     * Ways → clipped, simplified, flat [lat, lon, lat, lon, ...] lists
     * (rounded to 5 decimals, ~1 m).
     */
    public static toLines(ways: LatLon[][], bbox: CoastBbox, toleranceM: number): number[][] {
        const lines: number[][] = [];

        for (const way of ways) {
            for (const part of CoastlineGeometry.clip(way, bbox)) {
                const simple = CoastlineGeometry.simplify(part, toleranceM);
                const flat: number[] = [];

                for (const [lat, lon] of simple) {
                    flat.push(Math.round(lat * 100000) / 100000, Math.round(lon * 100000) / 100000);
                }

                lines.push(flat);
            }
        }

        return lines;
    }

    private static segmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = (dx * dx) + (dy * dy);
        const t = len === 0 ? 0 : Math.max(0, Math.min(1, (((p[0] - a[0]) * dx) + ((p[1] - a[1]) * dy)) / len));

        return Math.hypot(p[0] - a[0] - (t * dx), p[1] - a[1] - (t * dy));
    }

}
