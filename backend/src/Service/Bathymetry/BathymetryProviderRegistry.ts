import {Logger} from 'figtree';
import {EMODnetProvider} from './Providers/EMODnetProvider.js';
import {NoaaEtopoProvider} from './Providers/NoaaEtopoProvider.js';
import {BathymetryProvider, DepthInfo} from './Types.js';

/**
 * Registry that picks the best provider per coordinate and falls back to the
 * remaining providers if the chosen one fails.
 *
 * Order matters — the first supports() match wins, so list higher-resolution
 * regional providers (EMODnet for European waters) before global fallbacks
 * (NOAA ETOPO).
 */
export class BathymetryProviderRegistry {

    /**
     * Provider chain.
     * @private
     */
    private readonly _providers: BathymetryProvider[];

    public constructor(providers?: BathymetryProvider[]) {
        this._providers = providers ?? [
            new EMODnetProvider(),
            new NoaaEtopoProvider()
        ];
    }

    /**
     * Try each supporting provider in order. Returns the first non-null
     * result. Network errors are logged and lead to fallback; if no
     * provider supports the point or all fail, returns null.
     */
    public async getDepth(latitude: number, longitude: number): Promise<DepthInfo | null> {
        for (const provider of this._providers) {
            if (!provider.supports(latitude, longitude)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await provider.getDepth(latitude, longitude);

                if (result !== null) {
                    return result;
                }
            } catch (e) {
                Logger.getLogger().warn(
                    `Bathymetry provider '${provider.getName()}' failed for ${latitude},${longitude}: ${(e as Error).message}`
                );
            }
        }

        return null;
    }

}