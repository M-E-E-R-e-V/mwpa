import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {BathymetryProvider, DepthInfo} from '../Types.js';

type EsriIdentifyResponse = {
    value?: string;
    properties?: unknown;
};

/**
 * NOAA NCEI ETOPO 2022 provider — global coverage at ~15 arc-seconds.
 *
 * Uses the public ArcGIS ImageServer identify REST endpoint which returns
 * the elevation of the queried pixel in metres (negative = below sea
 * level).
 *
 * Free, no key required.
 * @see https://gis.ngdc.noaa.gov/arcgis/rest/services/etopo_2022/ImageServer
 */
export class NoaaEtopoProvider implements BathymetryProvider {

    /**
     * Stable provider id stored in DepthInfo.provider.
     */
    public static readonly NAME = 'noaa_etopo';

    /**
     * 1 request per 1.2 s. NOAA's ArcGIS endpoints are public but they
     * tag heavy clients — this is well below practical limits.
     * @private
     */
    private readonly _limiter = new RateLimiter(1200);

    public getName(): string {
        return NoaaEtopoProvider.NAME;
    }

    public supports(): boolean {
        return true;
    }

    public async getDepth(latitude: number, longitude: number): Promise<DepthInfo | null> {
        const geometry = JSON.stringify({
            x: longitude,
            y: latitude,
            spatialReference: {wkid: 4326}
        });

        const params = new URLSearchParams({
            geometry: geometry,
            geometryType: 'esriGeometryPoint',
            returnGeometry: 'false',
            returnCatalogItems: 'false',
            f: 'json'
        });

        const url = 'https://gis.ngdc.noaa.gov/arcgis/rest/services/etopo_2022/ImageServer/identify'
            + `?${params.toString()}`;

        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        let body: EsriIdentifyResponse;

        try {
            body = JSON.parse(response.body) as EsriIdentifyResponse;
        } catch {
            return null;
        }

        if (!body.value || body.value === 'NoData') {
            return null;
        }

        const elevation = parseFloat(body.value);

        if (Number.isNaN(elevation) || elevation >= 0) {
            return null;
        }

        return {
            depth_m: Math.round(-elevation),
            provider: NoaaEtopoProvider.NAME,
            fetched_at: Date.now()
        };
    }

}