import {Logger, ServiceJobAbstract} from 'figtree';
import {Sighting} from '../Db/MariaDb/Entities/Sighting.js';
import {SightingExtendedPatch, SightingExtendedRepository} from '../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {UtilIsInSea} from '../Utils/UtilIsInSea.js';
import {WeatherProviderRegistry} from './Weather/WeatherProviderRegistry.js';
import {WeatherInfo, WeatherSample} from './Weather/Types.js';

/**
 * Per-sighting status of the weather lookup, persisted as
 * `sighting_extended.weather_status`. The presence of
 * `weather_last_update` is the "already processed" marker.
 */
type WeatherStatus = 'ok' | 'land' | 'invalid_location' | 'invalid_date' | 'no_data';

/**
 * Background job that fills sea-state + SST + air-temperature + UV
 * metadata for every sighting.
 *
 * Each cron tick picks up to MAX_PER_RUN sightings whose
 * `weather_last_update` is NULL or older than the refresh threshold,
 * runs them through {@link WeatherProviderRegistry}, and upserts the
 * weather_* columns of `sighting_extended`. Only those columns are
 * touched — the depth_* columns and the provenance entries written by
 * DepthService stay intact thanks to the
 * {@link SightingExtendedRepository.upsertBySighting} merge.
 *
 * Refresh threshold: ~90 days. ERA5 archive values are stable; only
 * recently-recorded sightings (forecast-window range) might have their
 * upstream values revised, and that's why we re-fetch them every few
 * months. Force a refresh sooner by clearing `weather_last_update` in
 * the DB.
 *
 * Provider exceptions write NO marker — the next tick retries that
 * sighting. Permanent results (land, invalid_date, no_data) write a
 * marker so we don't keep hitting the upstream pointlessly.
 */
export class WeatherService extends ServiceJobAbstract {

    public static readonly NAME = 'weather';

    /**
     * Sightings processed per cron tick. With ~2.4 s per sighting
     * (two HTTP calls × 1.2 s rate-limit) the upper bound on wall time
     * is ~72 s, well inside the 5-minute cron window.
     * @private
     */
    private static readonly MAX_PER_RUN = 30;

    /**
     * Re-fetch weather values older than this.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;

    /**
     * Earliest date Open-Meteo's ERA5 reanalysis covers.
     * @private
     */
    private static readonly EARLIEST_DATE = '1940-01-01';

    /**
     * Value-column names (subset of WeatherSample fields) — used for
     * the per-column provenance map.
     * @private
     */
    private static readonly METRIC_KEYS: (keyof WeatherSample)[] = [
        'sst_c', 'air_temperature_c', 'uv_index',
        'wave_height_m', 'wave_period_s', 'wave_direction_deg'
    ];

    private readonly _registry: WeatherProviderRegistry;

    public constructor(registry?: WeatherProviderRegistry) {
        super(WeatherService.NAME, ['mariadb']);
        this._cron = '*/5 * * * *';
        this._registry = registry ?? new WeatherProviderRegistry();
    }

    /**
     * Build the weather-only patch. The `_day` and `_hour` columns are
     * always written (NULL when no value was produced), and the
     * provenance map is merged with whatever was there before so the
     * depth_m entry written by DepthService is never clobbered.
     * @private
     */
    private async _buildPatch(
        sightingId: number,
        status: WeatherStatus,
        weather: WeatherInfo | null,
        pickedHour: number | null
    ): Promise<SightingExtendedPatch> {
        const repo = SightingExtendedRepository.getInstance();
        const existing = await repo.findOneBySighting(sightingId);
        const provenance: Record<string, string> = {...existing?.provenance ?? {}};
        const day = weather?.day;
        const hourSample = weather?.hour;
        const provider = weather?.provider;

        for (const key of WeatherService.METRIC_KEYS) {
            const dayCol = `${key}_day`;
            const hourCol = `${key}_hour`;

            if (provider !== undefined && day?.[key] !== undefined) {
                provenance[dayCol] = provider;
            } else {
                delete provenance[dayCol];
            }

            if (provider !== undefined && hourSample?.[key] !== undefined) {
                provenance[hourCol] = provider;
            } else {
                delete provenance[hourCol];
            }
        }

        return {
            sst_c_day: day?.sst_c ?? null,
            sst_c_hour: hourSample?.sst_c ?? null,
            air_temperature_c_day: day?.air_temperature_c ?? null,
            air_temperature_c_hour: hourSample?.air_temperature_c ?? null,
            uv_index_day: day?.uv_index ?? null,
            uv_index_hour: hourSample?.uv_index ?? null,
            wave_height_m_day: day?.wave_height_m ?? null,
            wave_height_m_hour: hourSample?.wave_height_m ?? null,
            wave_period_s_day: day?.wave_period_s ?? null,
            wave_period_s_hour: hourSample?.wave_period_s ?? null,
            wave_direction_deg_day: day?.wave_direction_deg ?? null,
            wave_direction_deg_hour: hourSample?.wave_direction_deg ?? null,
            weather_hour_used: pickedHour,
            weather_status: status,
            weather_last_update: new Date(),
            provenance: provenance
        };
    }

    private async _writeResult(
        sightingId: number,
        status: WeatherStatus,
        weather: WeatherInfo | null,
        pickedHour: number | null
    ): Promise<void> {
        const patch = await this._buildPatch(sightingId, status, weather, pickedHour);
        await SightingExtendedRepository.getInstance().upsertBySighting(sightingId, patch);
    }

    /**
     * Read latitude/longitude from the JSON-encoded location_begin field.
     * @private
     */
    private _parseLocation(raw: string): {latitude: number; longitude: number;} | null {
        try {
            const data = JSON.parse(raw) as {latitude?: number; longitude?: number;};
            const lat = data.latitude;
            const lon = data.longitude;

            if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
                return {latitude: lat, longitude: lon};
            }
        } catch {
            // ignore — return null
        }

        return null;
    }

    /**
     * Strip the time portion off a "YYYY-MM-DD[ HH:mm:ss]" string and
     * validate the result against the date range Open-Meteo accepts
     * (1940-01-01 … today). Returns null on any other shape.
     * @private
     */
    private _parseIsoDate(raw: string): string | null {
        const dateOnly = raw.split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateOnly)) {
            return null;
        }

        if (dateOnly < WeatherService.EARLIEST_DATE) {
            return null;
        }

        const today = new Date().toISOString().slice(0, 10);

        if (dateOnly > today) {
            return null;
        }

        return dateOnly;
    }

    /**
     * Parse the hour-of-day (0..23) out of an "HH:mm[:ss]" string.
     * @private
     */
    private _parseHour(raw: string): number | null {
        const trimmed = raw.trim();

        if (trimmed === '') {
            return null;
        }

        const match = (/^(\d{1,2})(?::\d{1,2}){1,2}$/u).exec(trimmed);

        if (!match) {
            return null;
        }

        const hour = parseInt(match[1], 10);

        if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
            return null;
        }

        return hour;
    }

    /**
     * Pick the hour-of-day to use for the weather lookup. Prefers the
     * sighting's exact `duration_from` (precise sighting moment), falls
     * back to `tour_start` (tour begin), and returns null when neither
     * is parseable — caller then asks the provider for a day mean.
     * @private
     */
    private _pickHour(sighting: Sighting): number | null {
        return this._parseHour(sighting.duration_from)
            ?? this._parseHour(sighting.tour_start);
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const cutoff = new Date(Date.now() - WeatherService.REFRESH_INTERVAL_MS);
        const pending = await SightingExtendedRepository.getInstance().findStaleForWeather(
            cutoff,
            WeatherService.MAX_PER_RUN
        );

        if (pending.length === 0) {
            return;
        }

        logger.info(`WeatherService: processing ${pending.length} sighting(s)`);

        for (const sighting of pending) {
            const coords = this._parseLocation(sighting.location_begin);

            if (coords === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'invalid_location', null, null);
                continue;
            }

            const isoDate = this._parseIsoDate(sighting.date);

            if (isoDate === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'invalid_date', null, null);
                continue;
            }

            if (!UtilIsInSea.isInSea(coords.longitude, coords.latitude)) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'land', null, null);
                continue;
            }

            const hour = this._pickHour(sighting);

            try {
                // eslint-disable-next-line no-await-in-loop
                const weather = await this._registry.getWeather(
                    coords.latitude,
                    coords.longitude,
                    isoDate,
                    hour ?? undefined
                );

                if (weather === null) {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'no_data', null, hour);
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'ok', weather, hour);
                }
            } catch (e) {
                logger.error(
                    `WeatherService: lookup failed for sighting ${sighting.id} `
                    + `(${coords.latitude},${coords.longitude}@${isoDate}T${hour ?? '?'}): ${(e as Error).message}`
                );
            }
        }
    }

}