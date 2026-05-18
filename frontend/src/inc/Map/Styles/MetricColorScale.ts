/**
 * Simple sequential colour ramp for metric overlays. Maps a numeric
 * value in [min, max] to one of the ramp's colours via linear
 * interpolation in RGB space.
 *
 * Bundled here (no d3-scale-chromatic import) because the metric layers
 * only need a fixed 5-stop ramp per metric — pulling another d3 sub-
 * module just for this would inflate the bundle for no real win.
 */
export class MetricColorScale {

    /**
     * @protected
     */
    protected _stops: [number, number, number][];

    /**
     * @protected
     */
    protected _min: number;

    /**
     * @protected
     */
    protected _max: number;

    /**
     * Build a scale from a hex-colour ramp (e.g. ColorBrewer's `YlGn`
     * 5-class) and a value range.
     */
    public constructor(hexStops: string[], min: number, max: number) {
        this._stops = hexStops.map((h) => MetricColorScale._hexToRgb(h));
        this._min = min;
        this._max = max;
    }

    /**
     * @returns an `rgba(r, g, b, alpha)` string for `value`. Values
     * outside [min, max] clamp to the ramp's ends. NaN/undefined
     * collapse to a neutral grey at `alpha`.
     */
    public colorFor(value: number | null | undefined, alpha: number = 0.85): string {
        const [r, g, b, a] = this.colorForRgba(value, alpha);
        return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    }

    /**
     * Same interpolation as {@link colorFor} but returns the byte-tuple
     * `[r, g, b, a]` (each 0–255). Used by the IDW renderer, which
     * fills an ImageData buffer pixel-by-pixel and can't afford the
     * string-format/parse round-trip.
     */
    public colorForRgba(value: number | null | undefined, alpha: number = 0.85): [number, number, number, number] {
        const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);

        if (value === null || value === undefined || Number.isNaN(value)) {
            return [160, 160, 160, a];
        }

        if (this._stops.length === 0) {
            return [0, 0, 0, a];
        }

        if (this._stops.length === 1) {
            const [r, g, b] = this._stops[0];
            return [r, g, b, a];
        }

        const range = this._max - this._min;
        const normalised = range > 0
            ? Math.min(1, Math.max(0, (value - this._min) / range))
            : 0;

        const scaled = normalised * (this._stops.length - 1);
        const lower = Math.floor(scaled);
        const upper = Math.min(this._stops.length - 1, lower + 1);
        const frac = scaled - lower;

        const [r1, g1, b1] = this._stops[lower];
        const [r2, g2, b2] = this._stops[upper];

        const r = Math.round(r1 + ((r2 - r1) * frac));
        const g = Math.round(g1 + ((g2 - g1) * frac));
        const b = Math.round(b1 + ((b2 - b1) * frac));

        return [r, g, b, a];
    }

    public getMin(): number {
        return this._min;
    }

    public getMax(): number {
        return this._max;
    }

    public getStops(): string[] {
        return this._stops.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
    }

    /**
     * @protected
     */
    protected static _hexToRgb(hex: string): [number, number, number] {
        const clean = hex.startsWith('#') ? hex.slice(1) : hex;
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return [r, g, b];
    }

}