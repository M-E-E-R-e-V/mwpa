import * as d3raw from 'd3';
import moment from 'moment';
import {ToursTrackingSightingData} from '../../Api/Tours';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';

/*
 * Same pattern as MetricCharts.ts — the repo casts d3 to `any` to keep
 * the chart code readable. Switch to typed d3 if/when the project
 * standardises on the @types/d3 packages everywhere.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d3: any = d3raw;

/**
 * A single tracking point in chart-friendly form: timestamp ms-epoch,
 * speed in knots (computed if the raw position lacked a speed field).
 */
type ChartPoint = {
    timestamp: number;
    latitude: number;
    longitude: number;
    speed: number;
};

/**
 * Aggregated bar bucket.
 */
type Bucket = {
    bucketStart: number;
    bucketEnd: number;
    count: number;
    color: string;
    /** Average speed across the bucket — kts; null if no samples. */
    speedAvg: number | null;
};

/**
 * Callback signature emitted by {@link TrackingChart} when the user
 * brushes a range. `null` means the brush was cleared.
 */
export type TrackingChartSelectionFn = (range: {timestampFrom: number; timestampTo: number;} | null) => void;

/**
 * Color palette for sighting overlays. Lower-case `pointtype` matches
 * the species_group names emitted by the backend (see TourMap.ts).
 */
const POINTTYPE_COLORS: Record<string, string> = {
    mysticeti: '#2471A3',
    odontoceti: '#85C1E9',
    testudines: '#16a085',
    none: '#6c757d'
};

const BAR_COLOR_DEFAULT = '#6c757d';

/**
 * Speed thresholds in knots — the line uses three colors so the user
 * can read off "slow / cruising / fast" at a glance.
 */
const SPEED_SLOW_KTS = 3;
const SPEED_FAST_KTS = 10;

const COLOR_SPEED_SLOW = '#9e9e9e';
const COLOR_SPEED_MEDIUM = '#28a745';
const COLOR_SPEED_FAST = '#dc3545';

/**
 * Chart component drawn above the tour map. Renders one bar per time
 * bucket (count of tracking points) plus an overlaid speed line. A d3
 * brush lets the user select a time window which is forwarded to the
 * parent page (for highlighting on the map, or for delete/transfer).
 *
 * The component is self-contained — d3 owns the SVG and re-renders on
 * `setData` / `setBucketMinutes`.
 */
export class TrackingChart {

    /**
     * Container element supplied by the caller.
     */
    protected _host: HTMLElement;

    /**
     * Root SVG element (d3 selection — typed loosely; see top-of-file note).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _svg: any = null;

    protected _points: ChartPoint[] = [];
    protected _sightings: ToursTrackingSightingData[] = [];
    protected _bucketMinutes: number = 10;
    protected _onBrush: TrackingChartSelectionFn | null = null;

    public constructor(host: HTMLElement) {
        this._host = host;
        this._host.style.position = 'relative';
        this._host.style.width = '100%';
    }

    public setBucketMinutes(minutes: number): void {
        const clamped = Math.max(1, Math.floor(minutes));
        if (clamped === this._bucketMinutes) {
            return;
        }
        this._bucketMinutes = clamped;
        this._render();
    }

    public getBucketMinutes(): number {
        return this._bucketMinutes;
    }

    public setData(positions: string[], sightings: ToursTrackingSightingData[]): void {
        this._points = TrackingChart._parsePositions(positions);
        this._sightings = sightings;
        this._render();
    }

    public onBrush(fn: TrackingChartSelectionFn): void {
        this._onBrush = fn;
    }

    /**
     * Manually clear any active brush selection (e.g. after a successful
     * delete/transfer when the underlying data was reloaded).
     */
    public clearBrush(): void {
        if (!this._svg) {
            return;
        }
        const brushG = this._svg.select('g.brush');
        if (!brushG.empty()) {
            brushG.call(d3.brushX().move, null);
        }
    }

    private static _parsePositions(positions: string[]): ChartPoint[] {
        const parsed: ChartPoint[] = [];

        for (const raw of positions) {
            try {
                const obj = JSON.parse(raw) as GeolocationCoordinates;
                if (obj.timestamp === undefined || obj.latitude === undefined || obj.longitude === undefined) {
                    continue;
                }
                parsed.push({
                    timestamp: obj.timestamp,
                    latitude: obj.latitude,
                    longitude: obj.longitude,
                    speed: typeof obj.speed === 'number' && obj.speed >= 0 ? obj.speed : -1
                });
            } catch {
                // skip malformed JSON
            }
        }

        parsed.sort((a, b) => a.timestamp - b.timestamp);

        // Fill speed from consecutive points where missing (m/s → knots applied later).
        for (let i = 0; i < parsed.length; i++) {
            if (parsed[i].speed < 0 && i > 0) {
                const prev = parsed[i - 1];
                const curr = parsed[i];
                const dtSec = (curr.timestamp - prev.timestamp) / 1000;
                if (dtSec > 0) {
                    const distMeters = TrackingChart._haversine(
                        prev.latitude, prev.longitude,
                        curr.latitude, curr.longitude
                    );
                    parsed[i].speed = distMeters / dtSec;
                }
            }
            if (parsed[i].speed < 0) {
                parsed[i].speed = 0;
            }
        }

        return parsed;
    }

    private static _haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371000;
        const toRad = (n: number): number => n * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Pick a bar color based on whether the bucket overlaps an active
     * sighting. First sighting (by start) wins on overlap.
     */
    private _colorForBucket(bucketStart: number, bucketEnd: number): string {
        const overlapping = this._sightings
            .filter((s) => s.location_begin && s.location_end)
            .map((s) => {
                let ts = 0;
                let te = 0;
                try {
                    ts = (JSON.parse(s.location_begin) as GeolocationCoordinates).timestamp ?? 0;
                } catch { /* ignore */ }
                try {
                    te = (JSON.parse(s.location_end) as GeolocationCoordinates).timestamp ?? 0;
                } catch { /* ignore */ }
                return {ts, te, pointtype: s.pointtype};
            })
            .filter(({ts, te}) => ts > 0 && te > 0 && ts < bucketEnd && te > bucketStart)
            .sort((a, b) => a.ts - b.ts);

        if (overlapping.length === 0) {
            return BAR_COLOR_DEFAULT;
        }

        const pointtype = overlapping[0].pointtype || 'none';
        return POINTTYPE_COLORS[pointtype.toLowerCase()] ?? POINTTYPE_COLORS.none;
    }

    private static _speedColor(knots: number): string {
        if (knots < SPEED_SLOW_KTS) {
            return COLOR_SPEED_SLOW;
        }
        if (knots > SPEED_FAST_KTS) {
            return COLOR_SPEED_FAST;
        }
        return COLOR_SPEED_MEDIUM;
    }

    private _bucketize(): Bucket[] {
        if (this._points.length === 0) {
            return [];
        }

        const bucketMs = this._bucketMinutes * 60 * 1000;
        const first = this._points[0].timestamp;
        const last = this._points[this._points.length - 1].timestamp;
        const start = Math.floor(first / bucketMs) * bucketMs;
        const end = Math.ceil(last / bucketMs) * bucketMs;

        const buckets: Bucket[] = [];
        for (let t = start; t < end; t += bucketMs) {
            buckets.push({
                bucketStart: t,
                bucketEnd: t + bucketMs,
                count: 0,
                color: BAR_COLOR_DEFAULT,
                speedAvg: null
            });
        }

        if (buckets.length === 0) {
            return [];
        }

        const speedSums = new Float64Array(buckets.length);
        const speedCounts = new Int32Array(buckets.length);

        for (const point of this._points) {
            const idx = Math.floor((point.timestamp - start) / bucketMs);
            if (idx < 0 || idx >= buckets.length) {
                continue;
            }
            buckets[idx].count++;
            speedSums[idx] += point.speed;
            speedCounts[idx]++;
        }

        for (let i = 0; i < buckets.length; i++) {
            if (speedCounts[i] > 0) {
                // Convert avg m/s → knots (1 m/s ≈ 1.9438 kt).
                buckets[i].speedAvg = (speedSums[i] / speedCounts[i]) * 1.9438;
            }
            buckets[i].color = this._colorForBucket(buckets[i].bucketStart, buckets[i].bucketEnd);
        }

        return buckets;
    }

    private _render(): void {
        // Wipe previous render.
        d3.select(this._host).selectAll('*').remove();
        this._svg = null;

        const buckets = this._bucketize();

        if (buckets.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-muted text-center py-3';
            empty.textContent = 'No tracking points to chart.';
            this._host.appendChild(empty);
            return;
        }

        // Leave a small gutter so axis ticks / brush handles never spill
        // past the card body and trigger a horizontal scrollbar.
        const containerWidth = Math.max(320, (this._host.clientWidth || 800) - 24);
        const margin = {top: 16, right: 24, bottom: 32, left: 48};
        const width = containerWidth;
        const height = 180;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select(this._host)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('display', 'block');

        this._svg = svg;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xDomainStart = buckets[0].bucketStart;
        const xDomainEnd = buckets[buckets.length - 1].bucketEnd;

        const xScale = d3.scaleLinear()
            .domain([xDomainStart, xDomainEnd])
            .range([0, innerWidth]);

        const maxCount = d3.max(buckets, (b: Bucket) => b.count) ?? 1;
        const yScaleCount = d3.scaleLinear()
            .domain([0, maxCount])
            .nice()
            .range([innerHeight, 0]);

        const speedExtent = [
            0,
            Math.max(SPEED_FAST_KTS + 5, d3.max(buckets, (b: Bucket) => b.speedAvg ?? 0) ?? 0)
        ];
        const yScaleSpeed = d3.scaleLinear()
            .domain(speedExtent)
            .nice()
            .range([innerHeight, 0]);

        // Bars
        g.append('g')
            .attr('class', 'bars')
            .selectAll('rect')
            .data(buckets)
            .enter()
            .append('rect')
            .attr('x', (b: Bucket) => xScale(b.bucketStart))
            .attr('width', (b: Bucket) => Math.max(1, xScale(b.bucketEnd) - xScale(b.bucketStart) - 1))
            .attr('y', (b: Bucket) => yScaleCount(b.count))
            .attr('height', (b: Bucket) => innerHeight - yScaleCount(b.count))
            .attr('fill', (b: Bucket) => b.color)
            .attr('opacity', 0.75)
            .append('title')
            .text((b: Bucket) => {
                const t1 = moment(b.bucketStart).format('HH:mm');
                const t2 = moment(b.bucketEnd).format('HH:mm');
                const sp = b.speedAvg !== null ? `${b.speedAvg.toFixed(1)} kt` : '–';
                return `${t1}–${t2}\nPoints: ${b.count}\nSpeed avg: ${sp}`;
            });

        // Speed line — segmented so each piece gets its own color.
        const linePoints = buckets
            .filter((b: Bucket) => b.speedAvg !== null)
            .map((b: Bucket) => ({
                cx: (xScale(b.bucketStart) + xScale(b.bucketEnd)) / 2,
                cy: yScaleSpeed(b.speedAvg ?? 0),
                knots: b.speedAvg ?? 0
            }));

        const speedG = g.append('g').attr('class', 'speed-line');

        for (let i = 1; i < linePoints.length; i++) {
            const a = linePoints[i - 1];
            const b = linePoints[i];
            speedG.append('line')
                .attr('x1', a.cx)
                .attr('y1', a.cy)
                .attr('x2', b.cx)
                .attr('y2', b.cy)
                .attr('stroke', TrackingChart._speedColor(b.knots))
                .attr('stroke-width', 2);
        }

        // X axis — relative HH:mm labels.
        const xAxis = d3.axisBottom(xScale)
            .ticks(Math.min(buckets.length, 8))
            .tickFormat((d: number) => moment(d).format('HH:mm'));

        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis);

        // Y left = count, y right = speed kts.
        g.append('g').call(d3.axisLeft(yScaleCount).ticks(4));
        g.append('g')
            .attr('transform', `translate(${innerWidth},0)`)
            .call(d3.axisRight(yScaleSpeed).ticks(4));

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 12)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .text('points / bucket');

        g.append('text')
            .attr('transform', `translate(${innerWidth + margin.right - 6},${innerHeight / 2}) rotate(90)`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .text('speed (kt)');

        // Brush — emits range to caller.
        const brush = d3.brushX()
            .extent([[0, 0], [innerWidth, innerHeight]])
            .on('end', (event: {selection: [number, number] | null;}) => {
                if (!this._onBrush) {
                    return;
                }
                if (!event.selection) {
                    this._onBrush(null);
                    return;
                }
                const [x0, x1] = event.selection;
                this._onBrush({
                    timestampFrom: Math.round(xScale.invert(x0)),
                    timestampTo: Math.round(xScale.invert(x1))
                });
            });

        g.append('g')
            .attr('class', 'brush')
            .call(brush);
    }

}