import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {BathymetryProvider, DepthInfo} from '../Types.js';

/**
 * EMODnet Bathymetry provider — ~115 m resolution across European waters
 * (NE Atlantic, North Sea, Baltic, Mediterranean, Black Sea).
 *
 * Uses the public EMODnet ERDDAP griddap CSV endpoint, which returns the
 * nearest grid cell's elevation in metres (negative = below sea level).
 *
 * Free, attribution required (EMODnet Bathymetry Consortium 2022).
 * @see https://erddap.emodnet.eu/erddap/griddap/bathymetry_2022.html
 */
export class EMODnetProvider implements BathymetryProvider {

    /**
     * Stable provider id stored in DepthInfo.provider.
     */
    public static readonly NAME = 'emodnet';

    /**
     * Bounding box that approximates EMODnet bathymetry coverage. The grid
     * itself extends slightly further; this box is intentionally
     * conservative so points outside European waters fall through to a
     * global provider rather than getting a NaN back from ERDDAP.
     * @private
     */
    private static readonly BBOX = {
        latMin: 26,
        latMax: 86,
        lonMin: -35,
        lonMax: 43
    };

    /**
     * 1 request per 1.2 s — well below ERDDAP's per-IP throttling limits.
     * @private
     */
    private readonly _limiter = new RateLimiter(1200);

    public getName(): string {
        return EMODnetProvider.NAME;
    }

    public supports(latitude: number, longitude: number): boolean {
        const {latMin, latMax, lonMin, lonMax} = EMODnetProvider.BBOX;
        return latitude >= latMin && latitude <= latMax
            && longitude >= lonMin && longitude <= lonMax;
    }

    public async getDepth(latitude: number, longitude: number): Promise<DepthInfo | null> {
        const url = 'https://erddap.emodnet.eu/erddap/griddap/bathymetry_2022.csv'
            + `?elevation%5B(${latitude})%5D%5B(${longitude})%5D`;

        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        // ERDDAP CSV with three columns:
        //   latitude,longitude,elevation
        //   degrees_north,degrees_east,m
        //   <lat>,<lon>,<value>
        const lines = response.body.split('\n').filter((line: string) => line.trim() !== '');

        if (lines.length < 3) {
            return null;
        }

        const data = lines[2].split(',');
        const elevation = parseFloat(data[data.length - 1]);

        if (Number.isNaN(elevation) || elevation >= 0) {
            // NaN = no data, >=0 = land/intertidal — let the caller fall through
            return null;
        }

        return {
            depth_m: Math.round(-elevation),
            provider: EMODnetProvider.NAME,
            fetched_at: Date.now()
        };
    }

}