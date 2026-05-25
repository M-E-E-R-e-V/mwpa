import {StatusCodes} from 'figtree-schemas';
import {EarthquakeFilter, EarthquakeListResponse} from 'mwpa_schemas';
import {Vts} from 'vts';
import {EarthquakeRepository} from '../../../Db/MariaDb/Repositories/EarthquakeRepository.js';

const PAGE_LIMIT_DEFAULT = 100;
const PAGE_LIMIT_MAX = 1000;

/**
 * List
 *
 * Paginated, period-filtered admin listing of imported earthquakes.
 * Mirrors the ergonomics of the other admin list endpoints
 * (period_from / period_to / limit / offset) plus a min_magnitude
 * selector for the magnitude-cutoff slider on the page.
 */
export class List {

    public static async getList(filter: EarthquakeFilter | undefined): Promise<EarthquakeListResponse> {
        const safeFilter: EarthquakeFilter = Vts.isUndefined(filter) ? {} : filter;

        const limit = Math.min(Math.max(1, safeFilter.limit ?? PAGE_LIMIT_DEFAULT), PAGE_LIMIT_MAX);
        const offset = Math.max(0, safeFilter.offset ?? 0);

        const {rows, count} = await EarthquakeRepository.getInstance().findList(
            safeFilter.period_from,
            safeFilter.period_to,
            safeFilter.min_magnitude,
            limit,
            offset
        );

        return {
            statusCode: StatusCodes.OK,
            count: count,
            filter: safeFilter,
            list: rows.map((e) => ({
                id: e.id,
                source: e.source,
                source_event_id: e.source_event_id,
                event_time_ms: Number(e.event_time_ms),
                lat: e.lat,
                lon: e.lon,
                depth_km: e.depth_km ?? undefined,
                magnitude: e.magnitude,
                magnitude_type: e.magnitude_type,
                place: e.place,
                url: e.url
            }))
        };
    }

}