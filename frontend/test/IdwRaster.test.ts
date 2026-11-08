import {describe, expect, it} from 'vitest';
import {IdwField, IdwPoint} from '../src/inc/Map/Layers/IdwField';
import {IdwRaster} from '../src/inc/Map/Layers/IdwRaster';

/** Small helper — build a projected IDW point. */
const p = (x: number, y: number, v: number): IdwPoint => ({x, y, v});

describe('IdwField.valueAt', () => {

    it('returns null when there are no points', () => {
        expect(new IdwField([], 100, 4).valueAt(0, 0)).toBeNull();
    });

    it('returns null when every point is outside the radius', () => {
        expect(new IdwField([p(1000, 0, 5)], 100, 4).valueAt(0, 0)).toBeNull();
    });

    it('returns the exact value on a direct hit (d squared == 0)', () => {
        const field = new IdwField([p(0, 0, 42), p(3, 0, 10)], 1e9, 4);
        expect(field.valueAt(0, 0)).toBe(42);
    });

    it('returns a single in-range point unchanged', () => {
        expect(new IdwField([p(3, 0, 10)], 100, 4).valueAt(0, 0)).toBeCloseTo(10, 10);
    });

    it('averages two equidistant points (symmetric weights)', () => {
        const field = new IdwField([p(3, 0, 10), p(-3, 0, 20)], 100, 4);
        expect(field.valueAt(0, 0)).toBeCloseTo(15, 10);
    });

    it('weights the nearer point far more (power-2 inverse distance)', () => {
        // 100*(1/1) + 0*(1/25) over (1/1 + 1/25) = 100 / 1.04 ≈ 96.15
        const field = new IdwField([p(1, 0, 100), p(5, 0, 0)], 1000, 4);
        expect(field.valueAt(0, 0)).toBeCloseTo(96.153, 2);
    });

    it('ignores points beyond radiusSq', () => {
        // only (3,0) is within d² = 100; the far 1000 must not leak in
        const field = new IdwField([p(3, 0, 10), p(20, 0, 1000)], 100, 4);
        expect(field.valueAt(0, 0)).toBeCloseTo(10, 10);
    });

    it('keeps only the k nearest when more are in range', () => {
        // k = 1 → only the nearest (d²=1, v=100) survives; the farther is dropped
        const field = new IdwField([p(1, 0, 100), p(2, 0, 0)], 1000, 1);
        expect(field.valueAt(0, 0)).toBeCloseTo(100, 10);
    });

    it('reuses its buffers correctly across successive queries', () => {
        const field = new IdwField([p(0, 0, 1), p(10, 0, 100)], 1e9, 4);
        expect(field.valueAt(0, 0)).toBe(1);
        expect(field.valueAt(10, 0)).toBe(100);
        expect(field.valueAt(5, 0)).toBeCloseTo(50.5, 10);
    });

});

describe('IdwRaster.fillBlock', () => {

    it('paints a full step×step RGBA block and leaves the rest untouched', () => {
        const data = new Uint8ClampedArray(4 * 4 * 4);
        IdwRaster.fillBlock(data, {w: 4, h: 4, px: 0, py: 0, step: 2}, [10, 20, 30, 40]);

        // (0,0) and (1,1) inside the block
        expect([data[0], data[1], data[2], data[3]]).toEqual([10, 20, 30, 40]);
        const i11 = ((1 * 4) + 1) * 4;
        expect([data[i11], data[i11 + 1], data[i11 + 2], data[i11 + 3]]).toEqual([10, 20, 30, 40]);
        // (2,0) is outside the 2×2 block → still zero
        expect(data[2 * 4]).toBe(0);
    });

    it('clips the block at the canvas edge without writing out of bounds', () => {
        const data = new Uint8ClampedArray(4 * 4 * 4);
        IdwRaster.fillBlock(data, {w: 4, h: 4, px: 3, py: 3, step: 2}, [7, 8, 9, 255]);

        const i33 = ((3 * 4) + 3) * 4;
        expect([data[i33], data[i33 + 1], data[i33 + 2], data[i33 + 3]]).toEqual([7, 8, 9, 255]);
        // the buffer is exactly 16 px * 4 = 64 bytes; nothing beyond was written
        expect(data.length).toBe(64);
        expect(data[i33 + 4] ?? 0).toBe(0);
    });

});