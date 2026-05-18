import {Logger} from 'figtree';
import {ErddapProvider} from './Providers/ErddapProvider.js';
import {OceanInfo, OceanProvider} from './Types.js';

/**
 * Registry that picks the best provider per coordinate and falls back
 * if the chosen one fails. Currently wired with a single ERDDAP-based
 * provider (NOAA CoastWatch / JPL datasets, no auth, global coverage).
 *
 * The abstraction is here so a higher-quality provider can slot in
 * front of it later without touching OceanService — most likely a
 * CMEMS provider (account-credentialed, dataset-specific subsetter
 * URLs) once we hit a field ERDDAP can't deliver or want hourly
 * physics.
 */
export class OceanProviderRegistry {

    /**
     * Provider chain.
     * @private
     */
    private readonly _providers: OceanProvider[];

    public constructor(providers?: OceanProvider[]) {
        this._providers = providers ?? [
            new ErddapProvider()
        ];
    }

    /**
     * Try each supporting provider in order. Returns the first non-null
     * result. Network errors are logged and lead to fallback; if no
     * provider supports the point or all fail, returns null.
     */
    public async getOcean(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OceanInfo | null> {
        for (const provider of this._providers) {
            if (!provider.supports(latitude, longitude)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await provider.getOcean(latitude, longitude, isoDate);

                if (result !== null) {
                    return result;
                }
            } catch (e) {
                Logger.getLogger().warn(
                    `Ocean provider '${provider.getName()}' failed for ${latitude},${longitude}@${isoDate}: ${(e as Error).message}`
                );
            }
        }

        return null;
    }

}