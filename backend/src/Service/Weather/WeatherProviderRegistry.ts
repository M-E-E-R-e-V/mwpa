import {Logger} from 'figtree';
import {NasaPowerProvider} from './Providers/NasaPowerProvider.js';
import {OpenMeteoProvider} from './Providers/OpenMeteoProvider.js';
import {WeatherInfo, WeatherProvider, WeatherSample} from './Types.js';

/**
 * Registry that runs every supporting provider and merges their
 * results field-by-field — the first provider to supply a given
 * value wins. This lets us combine the broad-coverage
 * {@link OpenMeteoProvider} (SST + waves + air temperature) with the
 * specialised {@link NasaPowerProvider} (UV only, but for all years,
 * unlike Open-Meteo's ERA5-backed archive which lacks UV).
 *
 * The merged response carries a `provider_per_field` map so
 * {@link WeatherService} can record the right provenance per column
 * instead of crediting one upstream for values it didn't supply.
 *
 * Provider exceptions are logged and skipped; if no provider returns
 * anything at all, `getWeather` returns null.
 */
export class WeatherProviderRegistry {

    /**
     * Provider chain. Order matters: the first provider with a value
     * for a given field wins, so put the broad/authoritative source
     * before any fallbacks for that metric.
     * @private
     */
    private readonly _providers: WeatherProvider[];

    public constructor(providers?: WeatherProvider[]) {
        this._providers = providers ?? [
            new OpenMeteoProvider(),
            new NasaPowerProvider()
        ];
    }

    /**
     * Try every supporting provider and merge their results. First
     * provider with a value for a field wins; per-column provenance
     * is recorded in {@link WeatherInfo.provider_per_field}. Returns
     * null only when every provider failed or returned nothing.
     */
    public async getWeather(
        latitude: number,
        longitude: number,
        isoDate: string,
        hour?: number
    ): Promise<WeatherInfo | null> {
        const collected: {info: WeatherInfo; providerName: string;}[] = [];

        for (const provider of this._providers) {
            if (!provider.supports(latitude, longitude)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await provider.getWeather(latitude, longitude, isoDate, hour);

                if (result !== null) {
                    collected.push({info: result, providerName: provider.getName()});
                }
            } catch (e) {
                Logger.getLogger().warn(
                    `Weather provider '${provider.getName()}' failed for ${latitude},${longitude}@${isoDate}: ${(e as Error).message}`
                );
            }
        }

        if (collected.length === 0) {
            return null;
        }

        return WeatherProviderRegistry._merge(collected);
    }

    /**
     * @private
     */
    private static _merge(
        collected: {info: WeatherInfo; providerName: string;}[]
    ): WeatherInfo {
        const mergedDay: WeatherSample = {};
        const mergedHour: WeatherSample = {};
        const providerPerField: Record<string, string> = {};
        let hourUsed: number | undefined;
        let earliestFetched = Number.POSITIVE_INFINITY;

        for (const {info, providerName} of collected) {
            for (const key of Object.keys(info.day) as (keyof WeatherSample)[]) {
                const value = info.day[key];
                if (value !== undefined && mergedDay[key] === undefined) {
                    mergedDay[key] = value;
                    providerPerField[`${key}_day`] = providerName;
                }
            }

            if (info.hour) {
                for (const key of Object.keys(info.hour) as (keyof WeatherSample)[]) {
                    const value = info.hour[key];
                    if (value !== undefined && mergedHour[key] === undefined) {
                        mergedHour[key] = value;
                        providerPerField[`${key}_hour`] = providerName;
                    }
                }

                if (info.hour_used !== undefined && hourUsed === undefined) {
                    hourUsed = info.hour_used;
                }
            }

            if (info.fetched_at < earliestFetched) {
                earliestFetched = info.fetched_at;
            }
        }

        const result: WeatherInfo = {
            day: mergedDay,
            provider: collected.map((c) => c.providerName).join('+'),
            fetched_at: earliestFetched === Number.POSITIVE_INFINITY ? Date.now() : earliestFetched,
            provider_per_field: providerPerField
        };

        if (Object.keys(mergedHour).length > 0) {
            result.hour = mergedHour;
            if (hourUsed !== undefined) {
                result.hour_used = hourUsed;
            }
        }

        return result;
    }

}