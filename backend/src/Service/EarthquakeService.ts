import {Logger, ServiceJobAbstract} from 'figtree';
import {Earthquake} from '../Db/MariaDb/Entities/Earthquake.js';
import {EarthquakeRepository} from '../Db/MariaDb/Repositories/EarthquakeRepository.js';
import {SightingRepository} from '../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingSeismicRepository} from '../Db/MariaDb/Repositories/SightingSeismicRepository.js';
import {EarthquakeBboxResolver} from './Earthquake/EarthquakeBboxResolver.js';
import {EmscClient} from './Earthquake/EmscClient.js';
import {FdsnwsClient, FdsnwsEvent} from './Earthquake/FdsnwsClient.js';
import {UsgsClient} from './Earthquake/UsgsClient.js';

/**
 * Background job that imports earthquakes from USGS into the local
 * `earthquake` table and refreshes the `sighting_seismic` correlation
 * for affected sightings.
 *
 * Mirrors the FishingEffortService / OceanService pattern but works
 * "in reverse": instead of looking up env data per sighting, we pull
 * events for the entire union-bbox in one shot and then correlate to
 * every sighting that falls inside the configured window.
 */
export class EarthquakeService extends ServiceJobAbstract {

    public static readonly NAME = 'earthquake';

    /**
     * Minimum magnitude kept locally. USGS defaults to 2.5 for the
     * "significant" feed; lower events are mostly instrumental noise.
     */
    private static readonly MIN_MAGNITUDE = 2.5;

    /**
     * Radius (km) around each org's tracking-area centroid / HQ
     * coordinates used to build the USGS import bbox. Sized to cover
     * the Canaries archipelago + Moroccan shelf even when the
     * tracking-area polygon is just a harbor: a 500 km bubble at
     * 28°N is roughly ±4.5° lat × ±5.1° lon.
     */
    private static readonly IMPORT_RADIUS_KM = 500;

    /**
     * Correlation radius for sighting × earthquake matching. Earthquakes
     * farther than this from a sighting position are ignored entirely.
     */
    private static readonly CORRELATION_RADIUS_KM = 200;

    /**
     * Correlation time window (days). Anything outside ±this from the
     * sighting's local date won't correlate. 14 d is wide enough to
     * catch behavioural responses lagging behind a seismic event;
     * tighten in the analytics view if too noisy.
     */
    private static readonly CORRELATION_WINDOW_DAYS = 14;

    /**
     * Padding (days) before the oldest sighting date when cold-starting
     * a provider. The cron is hourly, so on a warm system the lookback
     * is "since this provider's latest event_time_ms". On cold start —
     * empty DB, or a newly added provider — we backfill to (oldest
     * sighting date - this many days) so every existing sighting has
     * the full ±CORRELATION_WINDOW_DAYS of events available.
     */
    private static readonly COLD_START_PRE_SIGHTING_DAYS = 30;

    /**
     * Mean Earth radius in km — used by the in-JS Haversine.
     */
    private static readonly EARTH_RADIUS_KM = 6371;

    /**
     * Catalog clients consulted in order on every import tick. USGS
     * keeps the bigger international events; EMSC covers small
     * regional events (Canaries, Mediterranean) that USGS misses.
     * Both run, both upsert with their own `source` tag — the two
     * may store the same physical event twice (different `source_event_id`),
     * which is acceptable given that there's no stable cross-catalog id.
     */
    private readonly _clients: FdsnwsClient[];

    public constructor(clients?: FdsnwsClient[]) {
        super(EarthquakeService.NAME, ['mariadb']);
        this._cron = '0 * * * *';
        this._clients = clients ?? [new UsgsClient(), new EmscClient()];
    }

    /**
     * Walk every earthquake already in the local table and re-run the
     * sighting correlation against it. Use after a wide backfill (so
     * old earthquakes that were just imported pick up their matching
     * historical sightings) or after a configuration change
     * (CORRELATION_RADIUS_KM / WINDOW_DAYS) where existing rows need
     * to be re-evaluated.
     *
     * Independent of the cron — runs on demand via the admin endpoint.
     */
    public async recorrelateAll(): Promise<{events: number; correlations: number;}> {
        const all = await EarthquakeRepository.getInstance().findAll();
        Logger.getLogger().info(`EarthquakeService: recorrelate over ${all.length} events`);
        const written = await this._correlate(all, new Set<number>());
        Logger.getLogger().info(`EarthquakeService: recorrelate done — correlations=${written}`);
        return {events: all.length, correlations: written};
    }

    protected async _execute(): Promise<void> {
        try {
            await this._import();
        } catch (err) {
            Logger.getLogger().error(`EarthquakeService: import failed: ${(err as Error).message}`);
        }
    }

    private async _import(): Promise<{imported: number; updated: number; correlations: number;}> {
        const bbox = await EarthquakeBboxResolver.resolveUnionBbox(EarthquakeService.IMPORT_RADIUS_KM);
        if (!bbox) {
            Logger.getLogger().info('EarthquakeService: no usable bbox, import skipped');
            return {imported: 0, updated: 0, correlations: 0};
        }

        const coldStartMs = await this._coldStartTime();
        if (coldStartMs === null) {
            Logger.getLogger().info('EarthquakeService: no sightings yet, import skipped');
            return {imported: 0, updated: 0, correlations: 0};
        }
        const endTimeMs = Date.now();

        Logger.getLogger().info(
            `EarthquakeService: import bbox lat[${bbox.min_lat.toFixed(2)}..${bbox.max_lat.toFixed(2)}] ` +
            `lon[${bbox.min_lon.toFixed(2)}..${bbox.max_lon.toFixed(2)}] (cold-start floor ${new Date(coldStartMs).toISOString()})`
        );

        let imported = 0;
        let updated = 0;
        let minStartMs = endTimeMs;

        for (const client of this._clients) {
            const source = client.getSource();
            // eslint-disable-next-line no-await-in-loop
            const latest = await EarthquakeRepository.getInstance().getLatestEventTimeMs(source);
            const startTimeMs = latest > 0 ? latest + 1 : coldStartMs;
            if (startTimeMs < minStartMs) {
                minStartMs = startTimeMs;
            }

            let events: FdsnwsEvent[];
            try {
                // eslint-disable-next-line no-await-in-loop
                events = await client.fetchEvents(bbox, startTimeMs, endTimeMs, EarthquakeService.MIN_MAGNITUDE);
            } catch (err) {
                Logger.getLogger().error(`EarthquakeService: ${source} fetch failed: ${(err as Error).message}`);
                continue;
            }
            Logger.getLogger().info(
                `EarthquakeService: ${source} from ${new Date(startTimeMs).toISOString()} → ${events.length} events`
            );

            for (const ev of events) {
                // eslint-disable-next-line no-await-in-loop
                const action = await EarthquakeRepository.getInstance().upsertBySourceEvent(ev);
                if (action === 'inserted') {
                    imported++;
                } else if (action === 'updated') {
                    updated++;
                }
            }
        }

        // Reload the rows we just touched (we need their `id` for the
        // correlation upsert) — span the earliest per-client start so
        // every freshly inserted event is in scope.
        const persisted = await EarthquakeRepository.getInstance().findByBboxAndTime(
            bbox,
            minStartMs,
            endTimeMs,
            EarthquakeService.MIN_MAGNITUDE
        );

        const correlations = await this._correlate(persisted, new Set<number>());

        Logger.getLogger().info(`EarthquakeService: done — imported=${imported} updated=${updated} correlations=${correlations}`);
        return {imported: imported, updated: updated, correlations: correlations};
    }

    /**
     * Floor for any provider's cold-start window: the oldest sighting
     * date minus COLD_START_PRE_SIGHTING_DAYS, expressed as ms-epoch
     * UTC midnight. Returns null when no sighting exists yet — caller
     * skips the import in that case.
     */
    private async _coldStartTime(): Promise<number | null> {
        const oldest = await SightingRepository.getInstance().getOldestSightingDate();
        if (!oldest) {
            return null;
        }
        const base = Date.parse(`${oldest}T00:00:00Z`);
        if (!Number.isFinite(base)) {
            return null;
        }
        return base - (EarthquakeService.COLD_START_PRE_SIGHTING_DAYS * 24 * 60 * 60 * 1000);
    }

    /**
     * For every earthquake in `events`, find sightings within
     * CORRELATION_RADIUS_KM and ±CORRELATION_WINDOW_DAYS, and upsert a
     * `sighting_seismic` row per matching pair.
     *
     * `correlated` is reserved for future de-dup across import passes;
     * unused for now but accepted by the signature to keep the cron
     * code below honest.
     */
    private async _correlate(events: Earthquake[], _correlated: Set<number>): Promise<number> {
        if (events.length === 0) {
            return 0;
        }
        const windowMs = EarthquakeService.CORRELATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

        let written = 0;
        for (const ev of events) {
            const dateFrom = EarthquakeService._isoDate(ev.event_time_ms - windowMs);
            const dateTo = EarthquakeService._isoDate(ev.event_time_ms + windowMs);

            // eslint-disable-next-line no-await-in-loop
            const sightings = await SightingRepository.getInstance().findInDateRange(dateFrom, dateTo);
            for (const s of sightings) {
                const pos = EarthquakeService._parsePos(s.location_begin);
                if (!pos) {
                    continue;
                }
                const dist = EarthquakeService._haversineKm(pos.lat, pos.lon, ev.lat, ev.lon);
                if (dist > EarthquakeService.CORRELATION_RADIUS_KM) {
                    continue;
                }

                const sightingMs = EarthquakeService._sightingTimeMs(s.date, s.tour_start);
                const offsetHours = (sightingMs - ev.event_time_ms) / (60 * 60 * 1000);
                if (Math.abs(offsetHours) > EarthquakeService.CORRELATION_WINDOW_DAYS * 24) {
                    continue;
                }

                // eslint-disable-next-line no-await-in-loop
                const wrote = await SightingSeismicRepository.getInstance().upsertCorrelation(
                    s.id,
                    ev.id,
                    dist,
                    offsetHours,
                    ev.magnitude
                );
                if (wrote) {
                    written++;
                }
            }
        }
        return written;
    }

    /**
     * Parse the JSON-stringified `location_begin` into [lon, lat] and
     * defensive-out on malformed rows.
     */
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

    private static _sightingTimeMs(date: string, tourStart: string): number {
        const base = Date.parse(`${date}T00:00:00Z`);
        if (!Number.isFinite(base)) {
            return 0;
        }
        const m = /^(\d{1,2}):(\d{2})/u.exec(tourStart ?? '');
        if (!m) {
            return base;
        }
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        return base + (((h * 60) + min) * 60 * 1000);
    }

    private static _haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const toRad = (n: number): number => (n * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = (Math.sin(dLat / 2) ** 2) +
            (Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            (Math.sin(dLon / 2) ** 2));
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EarthquakeService.EARTH_RADIUS_KM * c;
    }

    private static _isoDate(ms: number): string {
        return new Date(ms).toISOString().slice(0, 10);
    }

}