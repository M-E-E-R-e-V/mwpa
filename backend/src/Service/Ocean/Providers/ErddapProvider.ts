import {Logger} from 'figtree';
import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {OceanInfo, OceanProvider, OceanSample} from '../Types.js';

/**
 * Shape of an ERDDAP `.json` response from a griddap point query.
 * `rows` carries one entry per matching grid cell — the variable
 * values are at indices [time, lat, lon, ...vars] (= length of
 * columnNames - the leading 3 dimensions).
 */
type ErddapResponse = {
    table?: {
        columnNames?: string[];
        rows?: (string | number | null)[][];
    };
};

/**
 * Configuration for a single-variable ERDDAP dataset.
 */
type SingleVarDataset = {
    label: string;
    server: string;
    datasetId: string;
    variable: string;
    timeToleranceDays: number;
    earliestIsoDate: string;
    targetField: keyof OceanSample;

    /**
     * True when the dataset's grid has a leading altitude dimension
     * (`[time][altitude][lat][lon]`). We pin altitude to 0 m for the
     * surface value. Most modern NOAA CoastWatch chl-a / SSS products
     * carry this dimension; the older 3-D-only datasets do not.
     */
    hasAltitude?: boolean;

    transform?: (value: number) => number;
};

/**
 * Configuration for the altimetry dataset — three variables in one
 * GET: eastward (u), northward (v) currents combined into speed +
 * direction, plus sea-level anomaly (sla) piggy-backed on the same
 * request. NOAA CoastWatch's nesdisSSH1day ships them in a single
 * grid so two of the three OceanSample fields land for free.
 */
type AltimetryDataset = {
    label: string;
    server: string;
    datasetId: string;
    uVariable: string;
    vVariable: string;
    slaVariable: string;
    timeToleranceDays: number;
    earliestIsoDate: string;
    hasAltitude?: boolean;
};

/**
 * NOAA ERDDAP-based ocean provider — chlorophyll-a, surface salinity,
 * surface currents pulled from publicly hosted griddap datasets. No
 * authentication, JSON point queries.
 *
 * Each metric maps to one griddap dataset; per sighting we issue one
 * GET per metric (currents is one GET with two variables in the same
 * request). All calls share a single RateLimiter so we stay polite to
 * the upstream — there's no published quota but the de-facto limit on
 * CoastWatch / JPL ERDDAP is generous as long as nobody hammers it.
 *
 * Each dataset has a `timeToleranceDays` window because most products
 * are 4-day or 8-day composites (SMAP SSS), 5-day rolling (OSCAR), or
 * snapshot-daily with frequent cloud-gap pixels (MODIS chl-a). We
 * query the window around the sighting date and average the returned
 * non-null values.
 *
 * Each dataset has an `earliestIsoDate`; older sightings get NULL for
 * that field (and the others continue independently). Sea-level
 * anomaly is intentionally *not* fetched here — no reliably-named
 * NOAA-hosted ERDDAP dataset for global daily SLA exists; that field
 * stays NULL until the planned CMEMS provider lands.
 *
 * The dataset IDs below are sourced from the NOAA CoastWatch ERDDAP
 * catalog (https://coastwatch.noaa.gov/erddap/info/index.html). The
 * older `pfeg.noaa.gov/erddap` ids (erdMH1chla1day, jplSMAPSSS8day,
 * jplOscar_LonPM180) we shipped initially turned out to be either
 * stale (frozen at 2022-07) or 302-redirected to the canonical
 * `coastwatch.noaa.gov` host. We now point at the canonical host
 * directly so the provider doesn't depend on the pfeg load-balancer's
 * redirect behaviour.
 *
 * When a metric stops returning values, check the dataset's info page
 * and update the constants. The provider tolerates 404s gracefully
 * (that one metric stays NULL, the others continue), so a renamed
 * dataset surfaces as a silent gap, not a hard failure.
 */
export class ErddapProvider implements OceanProvider {

    /**
     * Stable provider id stored in OceanInfo.provider and provenance.
     */
    public static readonly NAME = 'erddap';

    /**
     * Single-variable datasets. Variable name and dataset id must
     * match the upstream ERDDAP catalog entry.
     * @private
     */
    private static readonly SINGLE_VAR_DATASETS: SingleVarDataset[] = [
        {
            label: 'chl-a (NOAA-20 VIIRS L3 daily)',
            server: 'https://coastwatch.noaa.gov/erddap',
            datasetId: 'noaacwN20VIIRSchlaDaily',
            variable: 'chlor_a',
            timeToleranceDays: 2,
            earliestIsoDate: '2018-01-01',
            targetField: 'chl_a_mg_m3',
            hasAltitude: true
        },
        {
            label: 'salinity (SMOS L3 daily 0.25°)',
            server: 'https://coastwatch.noaa.gov/erddap',
            datasetId: 'noaacwSMOSsssDaily',
            variable: 'sss',
            timeToleranceDays: 3,
            earliestIsoDate: '2010-06-01',
            targetField: 'salinity_psu',
            hasAltitude: true
        }
    ];

    /**
     * NOAA CoastWatch altimetry-derived sea-surface height + geostrophic
     * currents. One GET fetches ugos + vgos + sla together; the
     * currents collapse into speed + direction, while sla (metres)
     * lands in OceanSample.sla_cm after a ×100 conversion. This
     * dataset replaced the now-defunct OSCAR jplOscar_LonPM180.
     * @private
     */
    private static readonly ALTIMETRY_DATASET: AltimetryDataset = {
        label: 'altimetry (NOAA CoastWatch SSH+geostrophic daily 0.25°)',
        server: 'https://coastwatch.pfeg.noaa.gov/erddap',
        datasetId: 'nesdisSSH1day',
        uVariable: 'ugos',
        vVariable: 'vgos',
        slaVariable: 'sla',
        timeToleranceDays: 2,
        earliestIsoDate: '2017-02-13'
    };

    /**
     * 1.0 s min interval → ~60 req/min. With up to 3 GETs per sighting
     * (chl-a, salinity, currents) and 20 sightings/cron-tick that's
     * ~60 calls/tick = 720 calls/hour worst case, well below what
     * CoastWatch ERDDAP tolerates.
     * @private
     */
    private readonly _limiter = new RateLimiter(1000);

    public getName(): string {
        return ErddapProvider.NAME;
    }

    public supports(): boolean {
        return true;
    }

    public async getOcean(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OceanInfo | null> {
        const day: OceanSample = {};

        for (const dataset of ErddapProvider.SINGLE_VAR_DATASETS) {
            // eslint-disable-next-line no-await-in-loop
            const value = await this._fetchSingleVar(dataset, latitude, longitude, isoDate);

            if (value !== null) {
                day[dataset.targetField] = value;
            }
        }

        const altimetry = await this._fetchAltimetry(latitude, longitude, isoDate);

        if (altimetry !== null) {
            if (altimetry.speed !== null && altimetry.direction !== null) {
                day.current_speed_m_s = altimetry.speed;
                day.current_direction_deg = altimetry.direction;
            }
            if (altimetry.slaCm !== null) {
                day.sla_cm = altimetry.slaCm;
            }
        }

        if (ErddapProvider._isEmpty(day)) {
            return null;
        }

        return {
            day: day,
            provider: ErddapProvider.NAME,
            fetched_at: Date.now()
        };
    }

    /**
     * Fetch one variable in the dataset's time-tolerance window and
     * return the mean of finite values, or null when nothing matched.
     * @private
     */
    private async _fetchSingleVar(
        dataset: SingleVarDataset,
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<number | null> {
        if (isoDate < dataset.earliestIsoDate) {
            return null;
        }

        const url = ErddapProvider._buildUrl(
            dataset.server,
            dataset.datasetId,
            [dataset.variable],
            isoDate,
            dataset.timeToleranceDays,
            latitude,
            longitude,
            dataset.hasAltitude ?? false
        );

        const values = await this._fetchValues(url, dataset.label, 1);

        if (values === null || values[0].length === 0) {
            return null;
        }

        const mean = ErddapProvider._mean(values[0]);

        if (mean === null) {
            return null;
        }

        const transformed = dataset.transform ? dataset.transform(mean) : mean;
        return ErddapProvider._round(transformed, 2);
    }

    /**
     * Fetch ugos + vgos + sla in one call. Currents collapse into
     * speed (m/s) and oceanographic direction (degrees, towards); SLA
     * is converted from metres (dataset native) to cm (OceanSample
     * native). Returns nulls for the sub-fields that came back empty.
     * @private
     */
    private async _fetchAltimetry(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<{speed: number | null; direction: number | null; slaCm: number | null;} | null> {
        const dataset = ErddapProvider.ALTIMETRY_DATASET;

        if (isoDate < dataset.earliestIsoDate) {
            return null;
        }

        const url = ErddapProvider._buildUrl(
            dataset.server,
            dataset.datasetId,
            [dataset.uVariable, dataset.vVariable, dataset.slaVariable],
            isoDate,
            dataset.timeToleranceDays,
            latitude,
            longitude,
            dataset.hasAltitude ?? false
        );

        const values = await this._fetchValues(url, dataset.label, 3);

        if (values === null) {
            return null;
        }

        const u = values[0].length > 0 ? ErddapProvider._mean(values[0]) : null;
        const v = values[1].length > 0 ? ErddapProvider._mean(values[1]) : null;
        const slaM = values[2].length > 0 ? ErddapProvider._mean(values[2]) : null;

        let speed: number | null = null;
        let direction: number | null = null;

        if (u !== null && v !== null) {
            const rawSpeed = Math.sqrt((u * u) + (v * v));
            // atan2(u, v) so that 0° = current flowing north, 90° = east —
            // oceanographic "towards" convention.
            const rawDirection = (((Math.atan2(u, v) * 180) / Math.PI) + 360) % 360;
            speed = ErddapProvider._round(rawSpeed, 2);
            direction = Math.round(rawDirection);
        }

        const slaCm = slaM === null ? null : ErddapProvider._round(slaM * 100, 1);

        if (speed === null && slaCm === null) {
            return null;
        }

        return {speed: speed, direction: direction, slaCm: slaCm};
    }

    /**
     * GET an ERDDAP `.json` response, parse it, and return one array of
     * finite numeric values per requested variable (in the same order
     * the variables appeared in the URL). Returns null on HTTP error /
     * parse error / empty rows so callers fall back cleanly to NULL.
     * @private
     */
    private async _fetchValues(
        url: string,
        label: string,
        variableCount: number
    ): Promise<number[][] | null> {
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status === 404) {
            // Dataset renamed / removed — log once per call so the user
            // sees it in the logs and can update the constant.
            Logger.getLogger().warn(`ErddapProvider: dataset for '${label}' returned 404 — verify dataset id (${url})`);
            return null;
        }

        if (response.status !== 200) {
            return null;
        }

        try {
            const body = JSON.parse(response.body) as ErddapResponse;
            const columnNames = body.table?.columnNames ?? [];
            const rows = body.table?.rows ?? [];

            if (columnNames.length === 0 || rows.length === 0) {
                return null;
            }

            // Variable columns follow the leading dimensions (time, lat,
            // lon and possibly altitude/depth). Take the last
            // `variableCount` columns to be the variables.
            const startCol = columnNames.length - variableCount;
            const values: number[][] = [];

            for (let v = 0; v < variableCount; v++) {
                values.push([]);
            }

            for (const row of rows) {
                for (let v = 0; v < variableCount; v++) {
                    const raw = row[startCol + v];

                    if (typeof raw === 'number' && Number.isFinite(raw)) {
                        values[v].push(raw);
                    }
                }
            }

            return values;
        } catch {
            return null;
        }
    }

    /**
     * Build a griddap point-query URL. The time range uses the
     * tolerance window centred on isoDate; lat/lon are a single point
     * (ERDDAP snaps to the nearest grid cell). When `hasAltitude` is
     * true, the query includes a `[(0.0):(0.0)]` altitude constraint
     * for the surface value — required by NOAA CoastWatch's chl-a /
     * SSS grids which carry a leading altitude dimension.
     * @private
     */
    private static _buildUrl(
        server: string,
        datasetId: string,
        variables: string[],
        isoDate: string,
        toleranceDays: number,
        latitude: number,
        longitude: number,
        hasAltitude: boolean
    ): string {
        const start = ErddapProvider._shiftDate(isoDate, -toleranceDays);
        const end = ErddapProvider._shiftDate(isoDate, toleranceDays);
        const altitudePart = hasAltitude ? '[(0.0):(0.0)]' : '';
        const point = `${altitudePart}[(${latitude}):(${latitude})][(${longitude}):(${longitude})]`;
        const query = variables.map((v): string => `${v}[(${start}T00:00:00Z):(${end}T00:00:00Z)]${point}`).join(',');
        return `${server}/griddap/${datasetId}.json?${query}`;
    }

    /**
     * Add `deltaDays` to a YYYY-MM-DD string and return the resulting
     * YYYY-MM-DD. Uses UTC to avoid local-tz off-by-ones at the date
     * boundary.
     * @private
     */
    private static _shiftDate(isoDate: string, deltaDays: number): string {
        const date = new Date(`${isoDate}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + deltaDays);
        return date.toISOString().slice(0, 10);
    }

    /**
     * Mean of the finite numbers in xs. Returns null if empty.
     * @private
     */
    private static _mean(xs: number[]): number | null {
        if (xs.length === 0) {
            return null;
        }

        let sum = 0;

        for (const x of xs) {
            sum += x;
        }

        return sum / xs.length;
    }

    /**
     * True when the sample carries no metric.
     * @private
     */
    private static _isEmpty(sample: OceanSample): boolean {
        return sample.chl_a_mg_m3 === undefined
            && sample.salinity_psu === undefined
            && sample.sla_cm === undefined
            && sample.current_speed_m_s === undefined
            && sample.current_direction_deg === undefined;
    }

    /**
     * Round x to `digits` fractional places.
     * @private
     */
    private static _round(x: number, digits: number): number {
        const factor = 10 ** digits;
        return Math.round(x * factor) / factor;
    }

}