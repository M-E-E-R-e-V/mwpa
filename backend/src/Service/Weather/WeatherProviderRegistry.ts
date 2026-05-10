import {Logger} from 'figtree';
import {OpenMeteoProvider} from './Providers/OpenMeteoProvider.js';
import {WeatherInfo, WeatherProvider} from './Types.js';

/**
 * Registry that picks the best provider per coordinate and falls back if
 * the chosen one fails. Only one provider is wired today (Open-Meteo
 * Marine, global coverage) — the abstraction is here so a higher-quality
 * regional provider (e.g. Copernicus Marine) can slot in front of it
 * later without touching WeatherService.
 */
export class WeatherProviderRegistry {

    /**
     * Provider chain.
     * @private
     */
    private readonly _providers: WeatherProvider[];

    public constructor(providers?: WeatherProvider[]) {
        this._providers = providers ?? [
            new OpenMeteoProvider()
        ];
    }

    /**
     * Try each supporting provider in order. Returns the first non-null
     * result. Network errors are logged and lead to fallback; if no
     * provider supports the point or all fail, returns null.
     */
    public async getWeather(
        latitude: number,
        longitude: number,
        isoDate: string,
        hour?: number
    ): Promise<WeatherInfo | null> {
        for (const provider of this._providers) {
            if (!provider.supports(latitude, longitude)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await provider.getWeather(latitude, longitude, isoDate, hour);

                if (result !== null) {
                    return result;
                }
            } catch (e) {
                Logger.getLogger().warn(
                    `Weather provider '${provider.getName()}' failed for ${latitude},${longitude}@${isoDate}: ${(e as Error).message}`
                );
            }
        }

        return null;
    }

}