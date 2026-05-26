import {FdsnwsClient} from './FdsnwsClient.js';

/**
 * EMSC (European-Mediterranean Seismological Centre) catalog client.
 *
 * Same FDSNWS contract as USGS but a much denser catalog for
 * Mediterranean / Atlantic islands. Canary Islands events down to
 * ~M 1.0–2.0 are reliably reported here (vs. typically M ≥ 4 from
 * USGS), which is exactly what the species-profile correlation needs.
 *
 * Endpoint and event-detail URL pattern documented at
 * https://www.seismicportal.eu/realtime.html (the portal also hosts
 * the FDSNWS gateway).
 */
export class EmscClient extends FdsnwsClient {

    public static readonly ENDPOINT = 'https://www.seismicportal.eu/fdsnws/event/1/query';

    public override getEndpoint(): string {
        return EmscClient.ENDPOINT;
    }

    public override getSource(): string {
        return 'emsc';
    }

    protected override _getFormat(): string {
        return 'json';
    }

    protected override _buildEventUrl(featureId: string): string {
        if (!featureId) {
            return '';
        }
        return `https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(featureId)}`;
    }

}