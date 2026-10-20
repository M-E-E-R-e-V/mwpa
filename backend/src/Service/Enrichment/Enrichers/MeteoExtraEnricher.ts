import {RateLimiter} from '../../Common/RateLimiter.js';
import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {Enricher, EnricherResult, EnrichmentContext} from '../Types.js';

/**
 * Shape of the Open-Meteo hourly block we request here.
 */
type OpenMeteoExtraHourly = {
    pressure_msl?: (number | null)[];
    cloud_cover?: (number | null)[];
    visibility?: (number | null)[];
    precipitation?: (number | null)[];
};

type OpenMeteoExtraResponse = {
    hourly?: OpenMeteoExtraHourly;
};

/**
 * Extra-weather enricher — barometric pressure, cloud cover, visibility and
 * precipitation from Open-Meteo. These ride the same upstream the
 * WeatherService already uses (Forecast for recent dates, ERA5 Archive for
 * older ones); they are kept out of sighting_extended only because the raw
 * sighting table and its established derived tables are not modified here.
 *
 * Day aggregates: pressure/cloud/visibility as the day mean, precipitation
 * as the day total. `visibility` is a forecast-model field absent from the
 * ERA5 archive, so it is simply null for older dates.
 */
export class MeteoExtraEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'open_meteo';

    /**
     * Dates older than today − this many days use the Archive endpoint.
     * Mirrors OpenMeteoProvider.ARCHIVE_CUTOFF_DAYS.
     * @private
     */
    private static readonly ARCHIVE_CUTOFF_DAYS = 6;

    /**
     * Shared with nobody but paced like the weather provider (Open-Meteo
     * quota is cross-endpoint, but this is a separate process concern).
     * @private
     */
    private readonly _limiter = new RateLimiter(1200);

    public getName(): string {
        return MeteoExtraEnricher.NAME;
    }

    public async enrich(ctx: EnrichmentContext): Promise<EnricherResult> {
        const hourly = await this._fetch(ctx.latitude, ctx.longitude, ctx.isoDate);

        if (hourly === null) {
            return {
                fields: {meteo_status: 'no_data'},
                provenance: {}
            };
        }

        const fields: EnricherResult['fields'] = {meteo_status: 'ok'};
        const provenance: Record<string, string> = {};

        const pressure = MeteoExtraEnricher._mean(hourly.pressure_msl);

        if (pressure !== null) {
            fields.pressure_msl_hpa_day = MeteoExtraEnricher._round(pressure, 1);
            provenance.pressure_msl_hpa_day = MeteoExtraEnricher.NAME;
        }

        const cloud = MeteoExtraEnricher._mean(hourly.cloud_cover);

        if (cloud !== null) {
            fields.cloud_cover_pct_day = Math.round(cloud);
            provenance.cloud_cover_pct_day = MeteoExtraEnricher.NAME;
        }

        const visibility = MeteoExtraEnricher._mean(hourly.visibility);

        if (visibility !== null) {
            fields.visibility_m_day = Math.round(visibility);
            provenance.visibility_m_day = MeteoExtraEnricher.NAME;
        }

        const precipitation = MeteoExtraEnricher._sum(hourly.precipitation);

        if (precipitation !== null) {
            fields.precipitation_mm_day = MeteoExtraEnricher._round(precipitation, 2);
            provenance.precipitation_mm_day = MeteoExtraEnricher.NAME;
        }

        // Nothing usable came back — record no_data rather than a bare 'ok'.
        if (Object.keys(provenance).length === 0) {
            return {
                fields: {meteo_status: 'no_data'},
                provenance: {}
            };
        }

        return {
            fields: fields,
            provenance: provenance
        };
    }

    /**
     * Fetch the hourly block for the sighting day, Forecast or Archive.
     * @private
     */
    private async _fetch(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OpenMeteoExtraHourly | null> {
        const host = MeteoExtraEnricher._shouldUseArchive(isoDate)
            ? 'https://archive-api.open-meteo.com/v1/archive'
            : 'https://api.open-meteo.com/v1/forecast';

        const params = new URLSearchParams({
            latitude: `${latitude}`,
            longitude: `${longitude}`,
            start_date: isoDate,
            end_date: isoDate,
            hourly: 'pressure_msl,cloud_cover,visibility,precipitation',
            timezone: 'auto'
        });

        const url = `${host}?${params.toString()}`;
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        try {
            const body = JSON.parse(response.body) as OpenMeteoExtraResponse;
            return body.hourly ?? null;
        } catch {
            return null;
        }
    }

    /**
     * True when `isoDate` is solidly inside ERA5's covered range.
     * @private
     */
    private static _shouldUseArchive(isoDate: string): boolean {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - MeteoExtraEnricher.ARCHIVE_CUTOFF_DAYS);

        return isoDate < cutoff.toISOString().slice(0, 10);
    }

    /**
     * Mean of the finite numbers in xs, or null if none.
     * @private
     */
    private static _mean(xs: (number | null)[] | undefined): number | null {
        if (!xs) {
            return null;
        }

        let sum = 0;
        let count = 0;

        for (const x of xs) {
            if (x !== null && Number.isFinite(x)) {
                sum += x;
                count++;
            }
        }

        return count === 0 ? null : sum / count;
    }

    /**
     * Sum of the finite numbers in xs, or null if none present.
     * @private
     */
    private static _sum(xs: (number | null)[] | undefined): number | null {
        if (!xs) {
            return null;
        }

        let sum = 0;
        let count = 0;

        for (const x of xs) {
            if (x !== null && Number.isFinite(x)) {
                sum += x;
                count++;
            }
        }

        return count === 0 ? null : sum;
    }

    /**
     * Round to `digits` decimals.
     * @private
     */
    private static _round(value: number, digits: number): number {
        const factor = 10 ** digits;

        return Math.round(value * factor) / factor;
    }

}