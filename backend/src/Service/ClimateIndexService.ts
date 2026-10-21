import {Logger, ServiceJobAbstract} from '@stefanwerfling/figtree';
import {ClimateIndex} from '../Db/MariaDb/Entities/ClimateIndex.js';
import {ClimateIndexRepository} from '../Db/MariaDb/Repositories/ClimateIndexRepository.js';
import {httpGetWithRetry} from './Common/HttpGet.js';

/**
 * One parsed monthly index value.
 */
type MonthValue = {year: number; month: number; value: number;};

/**
 * Background job that keeps the `climate_index` table current from the public
 * NOAA CPC / PSL feeds — monthly North-Atlantic-scale indices (NAO, AMO, ONI).
 *
 * The feeds append one value per month, so the job just re-fetches all three,
 * diffs against the stored rows and bulk-saves the few that changed (normally
 * only the newest month). Each feed is independent: a failing download logs
 * and is skipped, leaving the other indices untouched — never fabricates.
 *
 * Not a per-sighting enricher: one value covers the whole basin per month, so
 * it lives in its own small table keyed by (year, month); analytics and the
 * R-export join it to a sighting via the sighting's calendar month.
 */
export class ClimateIndexService extends ServiceJobAbstract {

    public static readonly NAME = 'climate_index';

    /**
     * CPC normalised monthly NAO.
     * @private
     */
    private static readonly NAO_URL =
        'https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.nao.monthly.b5001.current.ascii';

    /**
     * CPC Oceanic Niño Index (3-month running seasons).
     * @private
     */
    private static readonly ONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt';

    /**
     * PSL AMO, unsmoothed + detrended.
     * @private
     */
    private static readonly AMO_URL = 'https://psl.noaa.gov/data/correlation/amon.us.data';

    /**
     * ONI season labels in calendar order; index + 1 is the season's centre
     * month (DJF → January, …, NDJ → December).
     * @private
     */
    private static readonly ONI_SEASONS: readonly string[] = [
        'DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'
    ];

    /**
     * Values at or below this are the PSL missing-data sentinel (-99.99).
     * @private
     */
    private static readonly MISSING_SENTINEL = -99;

    public constructor() {
        super(ClimateIndexService.NAME, ['mariadb']);
        // Monthly data — a daily pass at 04:10 is ample and cheap.
        this._cron = '10 4 * * *';
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const repo = ClimateIndexRepository.getInstance();

        const existing = await repo.findAllRows();
        const byKey = new Map<string, ClimateIndex>();
        for (const row of existing) {
            byKey.set(ClimateIndexService._key(row.year, row.month), row);
        }

        const dirty = new Set<ClimateIndex>();

        const apply = async(url: string, parse: (body: string) => MonthValue[], set: (row: ClimateIndex, v: number) => boolean): Promise<void> => {
            const response = await httpGetWithRetry(url, {timeoutMs: 20000});
            if (response.status !== 200) {
                logger.warn(`ClimateIndexService: ${url} returned HTTP ${response.status}`);
                return;
            }
            for (const mv of parse(response.body)) {
                const key = ClimateIndexService._key(mv.year, mv.month);
                let row = byKey.get(key);
                if (row === undefined) {
                    // eslint-disable-next-line no-await-in-loop
                    row = await repo.createRow(mv.year, mv.month);
                    byKey.set(key, row);
                }
                if (set(row, mv.value)) {
                    dirty.add(row);
                }
            }
        };

        try {
            await apply(ClimateIndexService.NAO_URL, ClimateIndexService._parseNao, (row, v) => {
                if (ClimateIndexService._differs(row.nao, v)) {
                    row.nao = v;
                    return true;
                }
                return false;
            });
        } catch (e) {
            logger.warn(`ClimateIndexService: NAO fetch failed: ${(e as Error).message}`);
        }

        try {
            await apply(ClimateIndexService.AMO_URL, ClimateIndexService._parseAmo, (row, v) => {
                if (ClimateIndexService._differs(row.amo, v)) {
                    row.amo = v;
                    return true;
                }
                return false;
            });
        } catch (e) {
            logger.warn(`ClimateIndexService: AMO fetch failed: ${(e as Error).message}`);
        }

        try {
            await apply(ClimateIndexService.ONI_URL, ClimateIndexService._parseOni, (row, v) => {
                if (ClimateIndexService._differs(row.oni, v)) {
                    row.oni = v;
                    return true;
                }
                return false;
            });
        } catch (e) {
            logger.warn(`ClimateIndexService: ONI fetch failed: ${(e as Error).message}`);
        }

        if (dirty.size > 0) {
            const now = new Date();
            for (const row of dirty) {
                row.last_update = now;
            }
            await repo.saveMany([...dirty]);
            logger.info(`ClimateIndexService: upserted ${dirty.size} climate-index month(s)`);
        }
    }

    /**
     * (year, month) map key.
     * @private
     */
    private static _key(year: number, month: number): string {
        return `${year}-${month}`;
    }

    /**
     * True when the stored value (TypeORM decimal → string | null) differs from
     * the freshly parsed one beyond rounding noise.
     * @private
     */
    private static _differs(current: number | string | null, next: number): boolean {
        if (current === null) {
            return true;
        }
        return Math.abs(Number(current) - next) > 0.0005;
    }

    /**
     * Round to the column's 3 decimals.
     * @private
     */
    private static _round3(v: number): number {
        return Math.round(v * 1000) / 1000;
    }

    /**
     * NAO: whitespace `YEAR MONTH VALUE` per line.
     * @private
     */
    private static _parseNao(body: string): MonthValue[] {
        const out: MonthValue[] = [];
        for (const line of body.split('\n')) {
            const t = line.trim().split(/\s+/u);
            if (t.length < 3) {
                continue;
            }
            const year = parseInt(t[0], 10);
            const month = parseInt(t[1], 10);
            const value = parseFloat(t[2]);
            if (!Number.isInteger(year) || year < 1900 || year > 2100) {
                continue;
            }
            if (!(month >= 1 && month <= 12) || !Number.isFinite(value)) {
                continue;
            }
            out.push({year: year, month: month, value: ClimateIndexService._round3(value)});
        }
        return out;
    }

    /**
     * ONI: header `SEAS YR TOTAL ANOM`, rows `DJF 1950 25.01 -1.32`. The ANOM
     * column is the ONI value; the season maps to its centre month.
     * @private
     */
    private static _parseOni(body: string): MonthValue[] {
        const out: MonthValue[] = [];
        for (const line of body.split('\n')) {
            const t = line.trim().split(/\s+/u);
            if (t.length < 4) {
                continue;
            }
            const month = ClimateIndexService.ONI_SEASONS.indexOf(t[0]) + 1;
            if (month === 0) {
                // header row ('SEAS') or anything unrecognised
                continue;
            }
            const year = parseInt(t[1], 10);
            const value = parseFloat(t[3]);
            if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isFinite(value)) {
                continue;
            }
            out.push({year: year, month: month, value: ClimateIndexService._round3(value)});
        }
        return out;
    }

    /**
     * AMO: a leading `startYear endYear` line, then `YEAR v1..v12` rows, then a
     * text footer. Only 13-token numeric rows are data; the PSL missing
     * sentinel (≤ -99) drops the individual month.
     * @private
     */
    private static _parseAmo(body: string): MonthValue[] {
        const out: MonthValue[] = [];
        for (const line of body.split('\n')) {
            const t = line.trim().split(/\s+/u);
            if (t.length !== 13) {
                continue;
            }
            const year = parseInt(t[0], 10);
            if (!Number.isInteger(year) || year < 1900 || year > 2100) {
                continue;
            }
            for (let m = 1; m <= 12; m++) {
                const value = parseFloat(t[m]);
                if (!Number.isFinite(value) || value <= ClimateIndexService.MISSING_SENTINEL) {
                    continue;
                }
                out.push({year: year, month: m, value: ClimateIndexService._round3(value)});
            }
        }
        return out;
    }

}