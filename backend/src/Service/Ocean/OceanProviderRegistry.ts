import {Logger} from '@stefanwerfling/figtree';
import {CmemsOceanProvider} from './Providers/CmemsOceanProvider.js';
import {ErddapProvider} from './Providers/ErddapProvider.js';
import {OceanInfo, OceanProvider, OceanSample} from './Types.js';

/**
 * Registry that MERGES ocean fields across providers: each provider fills the
 * fields it can, and the first provider to supply a given field wins. This
 * lets a higher-quality / more-reliable source sit in front for some fields
 * while another still contributes the rest.
 *
 * Wired as CMEMS (chl + salinity, public Copernicus Marine WMTS) → ERDDAP
 * (altimetric currents + SLA from the NOAA pfeg node, which also *would*
 * serve chl/sss from CoastWatch Central but that host is unreliable). With
 * the merge, CMEMS supplies chl/salinity and ERDDAP supplies currents/SLA —
 * neither shadows the other.
 */
export class OceanProviderRegistry {

    /**
     * Provider chain, in field-priority order.
     * @private
     */
    private readonly _providers: OceanProvider[];

    public constructor(providers?: OceanProvider[]) {
        this._providers = providers ?? [
            new CmemsOceanProvider(),
            new ErddapProvider()
        ];
    }

    /**
     * Query every supporting provider and merge their day samples. For each
     * field the first provider that supplies it wins; later providers only
     * fill fields still missing. `provider` on the result is the
     * comma-joined list of providers that actually contributed a field.
     * Network errors are logged and that provider is skipped. Returns null
     * when no provider produced any field.
     */
    public async getOcean(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OceanInfo | null> {
        const merged: OceanSample = {};
        const contributors: string[] = [];
        let fetchedAt = 0;

        for (const provider of this._providers) {
            if (!provider.supports(latitude, longitude)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await provider.getOcean(latitude, longitude, isoDate);

                if (result === null) {
                    continue;
                }

                if (OceanProviderRegistry._mergeInto(merged, result.day)) {
                    contributors.push(provider.getName());
                    fetchedAt = Math.max(fetchedAt, result.fetched_at);
                }
            } catch (e) {
                Logger.getLogger().warn(
                    `Ocean provider '${provider.getName()}' failed for ${latitude},${longitude}@${isoDate}: ${(e as Error).message}`
                );
            }
        }

        if (Object.keys(merged).length === 0) {
            return null;
        }

        return {
            day: merged,
            provider: contributors.join(','),
            fetched_at: fetchedAt
        };
    }

    /**
     * Copy fields present in `src` but still missing in `target`. Returns
     * true when at least one field was added.
     * @private
     */
    private static _mergeInto(target: OceanSample, src: OceanSample): boolean {
        let added = false;

        for (const key of Object.keys(src) as (keyof OceanSample)[]) {
            const value = src[key];

            if (target[key] === undefined && value !== undefined) {
                target[key] = value;
                added = true;
            }
        }

        return added;
    }

}