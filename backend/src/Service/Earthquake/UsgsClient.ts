import {FdsnwsClient} from './FdsnwsClient.js';

/**
 * USGS Earthquake Catalog (PDE/ANSS) client.
 *
 * Free, no key required. Note that USGS' international coverage is
 * thin for events below ~M 4 — for regional catalogues (Canaries,
 * Europe in general) the EMSC sibling client is the better source.
 * The EarthquakeService runs both in parallel by default; USGS still
 * contributes the bigger events that EMSC sometimes lags on.
 */
export class UsgsClient extends FdsnwsClient {

    public static readonly ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

    public override getEndpoint(): string {
        return UsgsClient.ENDPOINT;
    }

    public override getSource(): string {
        return 'usgs';
    }

}