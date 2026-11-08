import {ImportValue} from './ImportValue.js';

/**
 * Signed decimal-degree coordinate.
 */
export type ImportCoord = {
    lat: number;
    lon: number;
};

/**
 * Turns the spreadsheet's position columns into clean coordinates.
 *
 * The pre-computed GdM DD columns are trusted unless physically impossible;
 * then the raw `DD.MM.mmm` POSITION cell is re-parsed. Afterwards begin/end of
 * a sighting are cross-checked to recover integer-degree typos, and anything
 * still outside the dataset region is kept but flagged. Every correction is
 * recorded in `notes` for the run summary.
 */
export class CoordResolver {

    public static readonly LAT_LIMIT = 90;
    public static readonly LON_LIMIT = 180;

    /**
     * Dataset region (Canary Is. + the West-African coast). Coordinates outside
     * are kept but flagged for review — geographically possible, just unusually far.
     */
    public static readonly REGION = {
        latMin: 5,
        latMax: 35,
        lonMin: -25,
        lonMax: -5
    } as const;

    /**
     * Maximum distance (degrees) a cross-check-recovered endpoint may sit from
     * its anchor; a sighting's begin/end are the same short tour, so a correct
     * value stays close (~0.5° ≈ 55 km is already generous for these coastal trips).
     */
    public static readonly CROSS_MAX_DELTA = 0.5;

    /**
     * Coordinate diagnostics, printed in the run summary.
     */
    public readonly notes: string[] = [];

    /**
     * Parse a POSITION_N/_W cell to a magnitude in decimal degrees. The source
     * format is `DD.MM.mmm` text (degrees + decimal minutes, e.g. "17.08.52" =
     * 17°08.52'). Some rows lost the dots and are stored as a plain number,
     * e.g. 171493 = 17°14.93' — reconstruct those from a 6/7-digit DDMMmm(m).
     * Returns null when the value can't be read unambiguously.
     */
    public static dmToDD(v: unknown): number | null {
        if (v === null || v === undefined) {
            return null;
        }

        const s = `${v}`.trim();

        if (s === '') {
            return null;
        }

        let deg: number;
        let minStr: string;

        if ((/^\d+$/u).test(s)) {
            if (s.length < 6 || s.length > 7) {
                return null;
            }

            deg = parseInt(s.slice(0, 2), 10);
            minStr = `${s.slice(2, 4)}.${s.slice(4)}`;
        } else {
            const dot = s.indexOf('.');

            if (dot < 0) {
                return null;
            }

            deg = parseInt(s.slice(0, dot), 10);
            minStr = s.slice(dot + 1);
        }

        const min = parseFloat(minStr);

        if (!Number.isFinite(deg) || !Number.isFinite(min) || min < 0 || min >= 60) {
            return null;
        }

        return deg + (min / 60);
    }

    public static inRegion(lat: number, lon: number): boolean {
        const r = CoordResolver.REGION;

        return lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax;
    }

    /**
     * Fix a single axis whose integer degree is a data-entry typo (e.g. an end
     * lon "27°21.68" whose degree should be 17, matching the begin) by
     * borrowing the anchor's degree and keeping the suspicious value's own
     * minutes. Returns the corrected signed value, or null when it would not
     * land near the anchor.
     */
    public static fixAxisByAnchor(bad: number, anchor: number): number | null {
        const minutesFrac = Math.abs(bad) - Math.floor(Math.abs(bad));
        const cand = Math.sign(anchor) * (Math.floor(Math.abs(anchor)) + minutesFrac);

        if (Math.abs(cand - anchor) <= CoordResolver.CROSS_MAX_DELTA) {
            return cand;
        }

        return null;
    }

    /**
     * Return a single axis unchanged when it is already within [min, max];
     * only an out-of-range axis is handed to the anchor-based degree-typo fix.
     */
    public static recoverAxis(value: number, anchor: number, min: number, max: number): number {
        if (value >= min && value <= max) {
            return value;
        }

        return CoordResolver.fixAxisByAnchor(value, anchor) ?? value;
    }

    /**
     * Resolve one axis: trust the pre-computed GdM DD value, but when it is
     * physically impossible (a broken DD conversion in the source) recover it
     * from the raw POSITION cell. Returns the signed decimal degrees, or null to drop.
     */
    public resolveAxis(ddCell: unknown, rawCell: unknown, limit: number, sign: number, label: string): number | null {
        const dd = ImportValue.numOrNull(ddCell);

        if (dd === null) {
            return null;
        }

        if (Math.abs(dd) <= limit) {
            return dd;
        }

        const mag = CoordResolver.dmToDD(rawCell);

        if (mag !== null && mag <= limit) {
            const fixed = sign * mag;
            this.notes.push(`${label}: recovered ${dd} -> ${fixed.toFixed(5)} from raw "${String(rawCell)}"`);

            return fixed;
        }

        this.notes.push(`${label}: DROPPED (impossible ${dd}, raw "${String(rawCell)}" not recoverable)`);

        return null;
    }

    /**
     * Parse both axes to signed decimal degrees (recovering / dropping
     * impossible values per resolveAxis). Longitudes are west (negative).
     */
    public parseCoord(latDD: unknown, lonDD: unknown, rawLat: unknown, rawLon: unknown, label: string): ImportCoord | null {
        const lat = this.resolveAxis(latDD, rawLat, CoordResolver.LAT_LIMIT, 1, `${label} lat`);
        const lon = this.resolveAxis(lonDD, rawLon, CoordResolver.LON_LIMIT, -1, `${label} lon`);

        if (lat === null || lon === null) {
            return null;
        }

        return {lat: lat, lon: lon};
    }

    /**
     * Cross-check an out-of-region endpoint against the other (in-region)
     * endpoint of the same sighting and recover an unambiguous degree typo.
     * Deliberately skips the lon==lat copy error (there is no real longitude to
     * recover) and any candidate that would not land both in-region and near
     * the anchor. Returns a possibly-corrected coordinate.
     */
    public crossRecover(coord: ImportCoord | null, anchor: ImportCoord | null, label: string): ImportCoord | null {
        if (coord === null || anchor === null) {
            return coord;
        }

        if (CoordResolver.inRegion(coord.lat, coord.lon) || !CoordResolver.inRegion(anchor.lat, anchor.lon)) {
            return coord;
        }

        // lon was copied from lat (identical magnitudes) — nothing real to rebuild.
        if (Math.abs(Math.abs(coord.lon) - Math.abs(coord.lat)) < 1e-6) {
            return coord;
        }

        const r = CoordResolver.REGION;
        const lon = CoordResolver.recoverAxis(coord.lon, anchor.lon, r.lonMin, r.lonMax);
        const lat = CoordResolver.recoverAxis(coord.lat, anchor.lat, r.latMin, r.latMax);

        if ((lat !== coord.lat || lon !== coord.lon) && CoordResolver.inRegion(lat, lon)) {
            this.notes.push(
                `${label}: recovered degree typo ${coord.lat.toFixed(5)}/${coord.lon.toFixed(5)} -> ` +
                `${lat.toFixed(5)}/${lon.toFixed(5)} via the other endpoint`
            );

            return {lat: lat, lon: lon};
        }

        return coord;
    }

    /**
     * Serialize a parsed coordinate, flagging (keeping) anything still outside
     * the dataset region for manual review.
     */
    public finalizeCoord(coord: ImportCoord | null, label: string): string | null {
        if (coord === null) {
            return null;
        }

        if (!CoordResolver.inRegion(coord.lat, coord.lon)) {
            this.notes.push(`${label}: SUSPECT (kept) lat ${coord.lat} lon ${coord.lon} — far outside the dataset region, verify`);
        }

        return JSON.stringify({latitude: coord.lat, longitude: coord.lon});
    }

}