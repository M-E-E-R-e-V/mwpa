import {Logger} from 'figtree';
import {GfwProvider} from './Providers/GfwProvider.js';
import {FishingEffortInfo, FishingEffortProvider} from './Types.js';

/**
 * Registry that picks the best provider per coordinate and falls back
 * if the chosen one fails. Currently wired with a single Global
 * Fishing Watch provider (gated on MWPA_GFW_TOKEN env var — disables
 * itself cleanly when the token is absent).
 *
 * The abstraction is here so an alternative provider (e.g. a national
 * fisheries authority API in a specific region) can slot in later
 * without touching FishingEffortService.
 */
export class FishingEffortProviderRegistry {

    /**
     * Provider chain.
     * @private
     */
    private readonly _providers: FishingEffortProvider[];

    public constructor(providers?: FishingEffortProvider[]) {
        this._providers = providers ?? [
            new GfwProvider()
        ];
    }

    /**
     * True when at least one wired provider is enabled (supports() at
     * the equator) — used by the service to mark rows as 'no_provider'
     * when nothing can be queried, instead of retrying every tick.
     */
    public hasEnabledProvider(): boolean {
        // 0,0 is a coordinate every provider must accept-or-reject
        // based on credentials, not geography. A provider that's
        // geographically scoped should still return true here when
        // it's credentialed and ready.
        return this._providers.some((p) => p.supports(0, 0));
    }

    /**
     * Try each supporting provider in order. Returns the first non-null
     * result. Network errors are logged and lead to fallback; if no
     * provider supports the point or all fail, returns null.
     */
    public async getFishingEffort(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<FishingEffortInfo | null> {
        for (const provider of this._providers) {
            if (!provider.supports(latitude, longitude)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await provider.getFishingEffort(latitude, longitude, isoDate);

                if (result !== null) {
                    return result;
                }
            } catch (e) {
                Logger.getLogger().warn(
                    `FishingEffort provider '${provider.getName()}' failed for ${latitude},${longitude}@${isoDate}: ${(e as Error).message}`
                );
            }
        }

        return null;
    }

}