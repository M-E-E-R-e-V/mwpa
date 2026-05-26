import {StatusCodes} from 'figtree-schemas';
import {
    EarthquakeImpactBucket,
    EarthquakeImpactRequest,
    EarthquakeImpactResponse,
    EarthquakeImpactSighting,
    EarthquakeImpactTrack,
    EarthquakeImpactTrackSegment
} from 'mwpa_schemas';
import {Vts} from 'vts';
import {Earthquake} from '../../../Db/MariaDb/Entities/Earthquake.js';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {EarthquakeRepository} from '../../../Db/MariaDb/Repositories/EarthquakeRepository.js';
import {SightingMovementRepository} from '../../../Db/MariaDb/Repositories/SightingMovementRepository.js';
import {SightingMovementTrackRepository} from '../../../Db/MariaDb/Repositories/SightingMovementTrackRepository.js';
import {SightingSeismicImpactRow, SightingSeismicRepository} from '../../../Db/MariaDb/Repositories/SightingSeismicRepository.js';

/**
 * Impact
 *
 * Given one earthquake (by id) or all earthquakes on a UTC day, return
 * the affected sightings — within ±window_days of the events and
 * already correlated by the EarthquakeService cron into
 * `sighting_seismic`. Includes per-sighting movement tracks and four
 * analytics buckets for the Auswertung card.
 *
 * window_days ∈ {1, 3, 7, 14} — the stored correlation window in
 * EarthquakeService is ±14d, so any value beyond 14 here would be
 * silently capped at the storage cutoff. The UI never offers > 14.
 */
export class Impact {

    private static readonly ALLOWED_WINDOWS = [1, 3, 7, 14] as const;

    private static readonly HISTOGRAM_BUCKETS = 8;

    public static async run(request: EarthquakeImpactRequest | undefined): Promise<EarthquakeImpactResponse> {
        if (Vts.isUndefined(request)) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Missing request body'};
        }

        const windowDays = Impact._normaliseWindow(request.window_days);

        const earthquakes = await Impact._loadFocusEarthquakes(request);
        if (earthquakes.length === 0) {
            return {
                statusCode: StatusCodes.OK,
                earthquakes: [],
                sightings: [],
                tracks: [],
                analytics: Impact._emptyAnalytics()
            };
        }

        const earthquakeIds = earthquakes.map((e) => e.id);
        const windowHoursAbs = windowDays * 24;

        const impactRows = await SightingSeismicRepository.getInstance()
            .findImpactByEarthquakeIds(earthquakeIds, windowHoursAbs);

        const behaviourMap = await Impact._loadBehaviourMap();
        const sightings: EarthquakeImpactSighting[] = impactRows.map((r) => Impact._toSighting(r, behaviourMap));

        const sightingIds = Array.from(new Set(sightings.map((s) => s.id)));
        const tracks = await Impact._loadTracks(sightingIds);

        return {
            statusCode: StatusCodes.OK,
            earthquakes: earthquakes.map(Impact._toEarthquakeEntry),
            sightings: sightings,
            tracks: tracks,
            analytics: Impact._buildAnalytics(impactRows, behaviourMap, windowHoursAbs)
        };
    }

    private static _normaliseWindow(raw: number | undefined): number {
        const wd = Number(raw);
        if (!Number.isFinite(wd)) {
            return 3;
        }
        return Impact.ALLOWED_WINDOWS.includes(wd as (typeof Impact.ALLOWED_WINDOWS)[number]) ? wd : 3;
    }

    private static async _loadFocusEarthquakes(request: EarthquakeImpactRequest): Promise<Earthquake[]> {
        if (Array.isArray(request.earthquake_ids) && request.earthquake_ids.length > 0) {
            const ids = request.earthquake_ids.filter((n) => Number.isFinite(n) && n > 0);
            if (ids.length === 0) {
                return [];
            }
            return EarthquakeRepository.getInstance().findByIds(ids);
        }
        if (typeof request.earthquake_id === 'number' && request.earthquake_id > 0) {
            return EarthquakeRepository.getInstance().findByIds([request.earthquake_id]);
        }
        const date = (request.date ?? '').trim();
        if (date !== '') {
            return EarthquakeRepository.getInstance().findByDateUtc(date, 0);
        }
        return [];
    }

    private static async _loadBehaviourMap(): Promise<Map<number, string>> {
        const all = await BehaviouralStatesRepository.getInstance().findAll();
        const map = new Map<number, string>();
        for (const b of all) {
            map.set(b.id, b.name);
        }
        return map;
    }

    private static _toSighting(r: SightingSeismicImpactRow, behaviours: Map<number, string>): EarthquakeImpactSighting {
        const pos = Impact._parsePos(r.location_begin);
        return {
            id: r.sighting_id,
            earthquake_id: r.earthquake_id,
            date: r.date,
            tour_start: r.tour_start,
            lat: pos?.lat ?? 0,
            lon: pos?.lon ?? 0,
            species_id: r.species_id,
            species_name: r.species_name,
            behaviour_label: Impact._resolveBehaviours(r.behaviours, behaviours),
            encounter_id: r.encounter_id,
            encounter_name: r.encounter_name,
            distance_km: r.distance_km,
            hours_offset: r.hours_offset,
            magnitude: r.magnitude
        };
    }

    private static _parsePos(json: string): {lat: number; lon: number;} | null {
        if (!json) {
            return null;
        }
        try {
            const obj = JSON.parse(json) as {latitude?: number; longitude?: number;};
            if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number' &&
                Number.isFinite(obj.latitude) && Number.isFinite(obj.longitude)) {
                return {lat: obj.latitude, lon: obj.longitude};
            }
        } catch { /* ignore */ }
        return null;
    }

    private static _resolveBehaviours(raw: string, map: Map<number, string>): string {
        if (!raw) {
            return '';
        }
        const out: string[] = [];
        for (const part of raw.split(',')) {
            const id = parseInt(part.trim(), 10);
            if (!Number.isFinite(id) || id <= 0) {
                continue;
            }
            const name = map.get(id);
            if (name) {
                out.push(name);
            }
        }
        return out.join(', ');
    }

    private static async _loadTracks(sightingIds: number[]): Promise<EarthquakeImpactTrack[]> {
        if (sightingIds.length === 0) {
            return [];
        }
        const movements = await SightingMovementRepository.getInstance().findManyBySightings(sightingIds);
        if (movements.length === 0) {
            return [];
        }
        const movementIds = movements.map((m) => m.id);
        const movementById = new Map<number, number>();
        for (const m of movements) {
            movementById.set(m.id, m.sighting_id);
        }

        const segments = await SightingMovementTrackRepository.getInstance().findByMovements(movementIds);

        const bySighting = new Map<number, EarthquakeImpactTrackSegment[]>();
        for (const seg of segments) {
            const sid = movementById.get(seg.sighting_movement_id);
            if (sid === undefined) {
                continue;
            }
            let list = bySighting.get(sid);
            if (!list) {
                list = [];
                bySighting.set(sid, list);
            }
            list.push({
                start_lat: seg.start_lat,
                start_lon: seg.start_lon,
                end_lat: seg.end_lat,
                end_lon: seg.end_lon,
                quality: seg.quality
            });
        }

        const out: EarthquakeImpactTrack[] = [];
        for (const [sid, tracks] of bySighting.entries()) {
            out.push({sighting_id: sid, tracks: tracks});
        }
        return out;
    }

    private static _buildAnalytics(
        rows: SightingSeismicImpactRow[],
        behaviours: Map<number, string>,
        windowHoursAbs: number
    ): {
        by_species: EarthquakeImpactBucket[];
        by_behaviour: EarthquakeImpactBucket[];
        by_encounter: EarthquakeImpactBucket[];
        hours_offset_hist: EarthquakeImpactBucket[];
    } {
        // Deduplicate by sighting_id for the categorical buckets — a
        // sighting that falls into the window of several earthquakes
        // would otherwise inflate counts.
        const seenSighting = new Set<number>();
        const speciesCounts = new Map<string, number>();
        const behaviourCounts = new Map<string, number>();
        const encounterCounts = new Map<string, number>();

        for (const r of rows) {
            if (seenSighting.has(r.sighting_id)) {
                continue;
            }
            seenSighting.add(r.sighting_id);

            const species = r.species_name || `species#${r.species_id}`;
            speciesCounts.set(species, (speciesCounts.get(species) ?? 0) + 1);

            const encounter = r.encounter_name || (r.encounter_id > 0 ? `encounter#${r.encounter_id}` : '—');
            encounterCounts.set(encounter, (encounterCounts.get(encounter) ?? 0) + 1);

            if (r.behaviours) {
                for (const part of r.behaviours.split(',')) {
                    const id = parseInt(part.trim(), 10);
                    if (!Number.isFinite(id) || id <= 0) {
                        continue;
                    }
                    const name = behaviours.get(id) ?? `behaviour#${id}`;
                    behaviourCounts.set(name, (behaviourCounts.get(name) ?? 0) + 1);
                }
            }
        }

        return {
            by_species: Impact._mapToBuckets(speciesCounts),
            by_behaviour: Impact._mapToBuckets(behaviourCounts),
            by_encounter: Impact._mapToBuckets(encounterCounts),
            hours_offset_hist: Impact._histogramOffsets(rows, windowHoursAbs)
        };
    }

    private static _mapToBuckets(counts: Map<string, number>): EarthquakeImpactBucket[] {
        return Array.from(counts.entries())
            .map(([key, count]) => ({key: key, count: count}))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * 8 equal-width buckets across [-windowHoursAbs, +windowHoursAbs].
     * Labels read "-72..-48 h" so the frontend can render the bars as-is.
     * Counts use every (sighting × earthquake) row — same physical
     * sighting can land in multiple offset buckets if it sits inside
     * several earthquakes' windows, which is the right semantics for an
     * offset histogram (it answers "when relative to a quake do
     * sightings cluster").
     */
    private static _histogramOffsets(rows: SightingSeismicImpactRow[], windowHoursAbs: number): EarthquakeImpactBucket[] {
        if (windowHoursAbs <= 0) {
            return [];
        }
        const buckets = Impact.HISTOGRAM_BUCKETS;
        const step = (windowHoursAbs * 2) / buckets;
        const counts: number[] = new Array(buckets).fill(0);

        for (const r of rows) {
            const off = r.hours_offset;
            if (off < -windowHoursAbs || off > windowHoursAbs) {
                continue;
            }
            let idx = Math.floor((off + windowHoursAbs) / step);
            if (idx >= buckets) {
                idx = buckets - 1;
            }
            if (idx < 0) {
                idx = 0;
            }
            counts[idx]++;
        }

        const out: EarthquakeImpactBucket[] = [];
        for (let i = 0; i < buckets; i++) {
            const lo = -windowHoursAbs + (i * step);
            const hi = lo + step;
            out.push({
                key: `${Impact._formatHours(lo)}..${Impact._formatHours(hi)} h`,
                count: counts[i]
            });
        }
        return out;
    }

    private static _formatHours(h: number): string {
        const sign = h > 0 ? '+' : '';
        return `${sign}${Math.round(h)}`;
    }

    private static _emptyAnalytics(): {
        by_species: EarthquakeImpactBucket[];
        by_behaviour: EarthquakeImpactBucket[];
        by_encounter: EarthquakeImpactBucket[];
        hours_offset_hist: EarthquakeImpactBucket[];
    } {
        return {by_species: [], by_behaviour: [], by_encounter: [], hours_offset_hist: []};
    }

    private static _toEarthquakeEntry(e: Earthquake): {
        id: number;
        source: string;
        source_event_id: string;
        event_time_ms: number;
        lat: number;
        lon: number;
        depth_km?: number;
        magnitude: number;
        magnitude_type: string;
        place: string;
        url: string;
    } {
        return {
            id: e.id,
            source: e.source,
            source_event_id: e.source_event_id,
            event_time_ms: Number(e.event_time_ms),
            lat: e.lat,
            lon: e.lon,
            depth_km: e.depth_km ?? undefined,
            magnitude: e.magnitude,
            magnitude_type: e.magnitude_type,
            place: e.place,
            url: e.url
        };
    }

}