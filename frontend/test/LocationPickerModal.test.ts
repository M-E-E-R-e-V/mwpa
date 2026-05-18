import {describe, expect, it} from 'vitest';
import {LocationPickerModal} from '../src/inc/Widget/LocationPickerModal';
import {GeolocationCoordinates} from '../src/inc/Types/GeolocationCoordinates';

/**
 * The picker's snap math is a `protected static` method — surface it
 * here via a typed cast so the tests don't have to subclass the
 * (jQuery/bambooo-heavy) modal to reach the function.
 */
const snap = (LocationPickerModal as unknown as {
    _snapToRoute: (lat: number, lon: number, route: GeolocationCoordinates[]) => {lat: number; lon: number} | null;
})._snapToRoute;

/** Small helper — `[lon, lat]` pairs are easier to write than full GeolocationCoordinates literals. */
const pt = (lon: number, lat: number): GeolocationCoordinates => ({longitude: lon, latitude: lat});

describe('LocationPickerModal._snapToRoute', () => {

    it('returns null for a route with fewer than two vertices', () => {
        expect(snap(28.05, -17.33, [])).toBeNull();
        expect(snap(28.05, -17.33, [pt(-17.33, 28.05)])).toBeNull();
    });

    it('returns null when the route has vertices but they all lack coordinates', () => {
        // Bug-class: legacy tracking-points imported without lat/lon shouldn't
        // crash the projector — they should be filtered and the result behave
        // as "route too short".
        expect(snap(28.05, -17.33, [{timestamp: 1}, {timestamp: 2}])).toBeNull();
    });

    it('snaps a point exactly on a vertex to that vertex', () => {
        const route = [pt(-17.34, 28.05), pt(-17.32, 28.07)];
        const result = snap(28.05, -17.34, route);
        expect(result).not.toBeNull();
        // Mercator round-trip drifts a few µm at this latitude — strict
        // equality would be fragile, so allow ~5cm slop.
        expect(result!.lat).toBeCloseTo(28.05, 6);
        expect(result!.lon).toBeCloseTo(-17.34, 6);
    });

    it('projects a point off the line onto the nearest segment', () => {
        // Straight east-west segment at lat 28.05; pick is 0.01° north.
        // Expected snap: same longitude, latitude on the line.
        const route = [pt(-17.34, 28.05), pt(-17.32, 28.05)];
        const result = snap(28.06, -17.33, route);
        expect(result).not.toBeNull();
        expect(result!.lat).toBeCloseTo(28.05, 4);
        expect(result!.lon).toBeCloseTo(-17.33, 4);
    });

    it('snaps to whichever segment of a multi-vertex polyline is closest', () => {
        // L-shaped polyline: horizontal stretch at lat 28.00 from lon
        // -17.34 → -17.30, then vertical stretch at lon -17.30 from
        // lat 28.00 → 28.10. A pick near the vertical leg's middle must
        // land on that leg (lon ≈ -17.30), not on the horizontal one.
        const route = [
            pt(-17.34, 28.00),
            pt(-17.30, 28.00),
            pt(-17.30, 28.10)
        ];
        const result = snap(28.05, -17.295, route);
        expect(result).not.toBeNull();
        // Mercator-distance from the vertical leg dominates; snapped
        // longitude must match the leg's longitude, latitude lands on it.
        expect(result!.lon).toBeCloseTo(-17.30, 3);
        expect(result!.lat).toBeCloseTo(28.05, 3);
    });

    it('clamps to a segment endpoint when the projection would fall outside', () => {
        // Pick well past the eastern end of a short east-pointing segment.
        // The classic line-projection algo would return t>1; we clamp,
        // so the result must equal the eastern endpoint.
        const route = [pt(-17.34, 28.05), pt(-17.32, 28.05)];
        const result = snap(28.05, -17.20, route);
        expect(result).not.toBeNull();
        expect(result!.lon).toBeCloseTo(-17.32, 4);
        expect(result!.lat).toBeCloseTo(28.05, 4);
    });

});