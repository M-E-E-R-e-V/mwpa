import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {DefaultHandlerReturn, HandlerResultType} from 'figtree-schemas';
import JSZip from 'jszip';
import {
    SchemaMWPASessionData,
    RightExport,
} from 'mwpa_schemas';
import {ClimateIndexRepository} from '../../Db/MariaDb/Repositories/ClimateIndexRepository.js';
import {SightingRepository} from '../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {Users} from '../../Users/Users.js';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';

/**
 * Sightings-for-R export.
 *
 * GET `/json/export/sightings-for-r` streams a ZIP with two tidy CSVs ready
 * for an external mixed-effects analysis in R:
 *   - `sightings.csv` — one row per sighting (response + covariates), keyed by
 *     `tour_fid` so the tour can enter the model as a random effect:
 *       `glmer(group_size ~ sst_c + depth_m + (1 | tour_fid), family = poisson)`
 *   - `tours.csv` — one row per tour (effort denominators + grouping table),
 *     including a derived `duration_hours`.
 *   - `README.txt` — column notes + the caveat that tour is the cluster unit.
 *
 * Plain GET (no body) so the frontend's download flow can reach it. Non-admins
 * are scoped to their organisations (sightings via vehicle, tours via the
 * tour's organisation_id — matching the SPUE pipeline); admins get everything.
 */
export class SightingsForR extends DefaultRoute {

    /**
     * Columns emitted in sightings.csv, in order. Keys index the raw export row.
     * @private
     */
    private static readonly SIGHTING_COLUMNS: readonly string[] = [
        'sighting_id', 'unid', 'tour_fid', 'date', 'time', 'species_id', 'species_name',
        'lat', 'lon', 'group_size', 'juveniles', 'calves', 'newborns', 'beaufort',
        'distance_coast_m', 'depth_m', 'sst_c_day', 'chl_a_mg_m3_day', 'salinity_psu_day',
        'sla_cm_day', 'current_speed_m_s_day', 'wave_height_m_day', 'uv_index_day',
        'wind_speed_m_s_day', 'avg_speed_mps', 'max_speed_mps', 'total_distance_m',
        'fishing_hours_day_25km', 'nao', 'amo', 'oni', 'vehicle_id', 'vehicle_driver_id', 'organization_id'
    ];

    /**
     * Columns emitted in tours.csv, in order.
     * @private
     */
    private static readonly TOUR_COLUMNS: readonly string[] = [
        'tour_id', 'tour_fid', 'date', 'tour_start', 'tour_end', 'duration_hours',
        'vehicle_id', 'vehicle_driver_id', 'organization_id'
    ];

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/export/sightings-for-r',
            checkMWPAUserIsLoginACL,
            async(_req, res, data): Promise<DefaultHandlerReturn> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                const organizationIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);

                const nowIso = new Date().toISOString();
                const buffer = await SightingsForR._build(organizationIds, nowIso);

                const filename = `mwpa_sightings_for_r_${nowIso.slice(0, 10)}.zip`;
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', `${buffer.length}`);
                res.end(buffer);

                return {type: HandlerResultType.handled};
            },
            {
                aclRight: RightExport.export_read,
                description: 'Download a ZIP (sightings.csv + tours.csv + README) for external mixed-effects '
                    + 'analysis in R — tour_fid is the cluster unit for a random effect. Non-admins are scoped '
                    + 'to their organisations; admins export the full dataset.',
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

    /**
     * Build the ZIP buffer (sightings.csv + tours.csv + README.txt).
     * @private
     */
    private static async _build(organizationIds: number[] | undefined, nowIso: string): Promise<Buffer> {
        const sightingRows = await SightingRepository.getInstance().findAllForExport(undefined, undefined, organizationIds);
        const tourRows = await SightingTourRepository.getInstance().findAllForExport(undefined, undefined, organizationIds);

        // Monthly climate indices, joined to each sighting via its (year, month).
        const climateRows = await ClimateIndexRepository.getInstance().findAllRows();
        const climateByYm = new Map<string, {nao: number | null; amo: number | null; oni: number | null;}>();
        for (const c of climateRows) {
            climateByYm.set(`${c.year}-${c.month}`, {nao: c.nao, amo: c.amo, oni: c.oni});
        }

        const sightingCsv: string[] = [SightingsForR.SIGHTING_COLUMNS.join(',')];
        for (const r of sightingRows) {
            const lonLat = SightingsForR._parseLonLat(r.location_begin);
            const climate = climateByYm.get(SightingsForR._ymKey(r.date)) ?? {nao: null, amo: null, oni: null};
            const values: (string | number | null)[] = [
                r.id, r.unid, r.tour_fid, r.date, SightingsForR._hhmm(r.tour_start),
                r.species_id, r.species_name ?? '',
                lonLat ? lonLat[1] : null, lonLat ? lonLat[0] : null,
                r.species_count, r.juveniles, r.calves, r.newborns, r.beaufort_wind,
                SightingsForR._numOrEmpty(r.distance_coast), r.depth_m, r.sst_c_day, r.chl_a_mg_m3_day,
                r.salinity_psu_day, r.sla_cm_day, r.current_speed_m_s_day, r.wave_height_m_day,
                r.uv_index_day, r.wind_speed_m_s_day, r.avg_speed_mps, r.max_speed_mps,
                r.total_distance_m, r.fishing_hours_day_25km, climate.nao, climate.amo, climate.oni,
                r.vehicle_id, r.vehicle_driver_id, r.organization_id
            ];
            sightingCsv.push(values.map((v) => SightingsForR._cell(v)).join(','));
        }

        const tourCsv: string[] = [SightingsForR.TOUR_COLUMNS.join(',')];
        for (const t of tourRows) {
            const dur = t.duration_hours === null || t.duration_hours === undefined
                ? null
                : Math.round(Number(t.duration_hours) * 100) / 100;
            const values: (string | number | null)[] = [
                t.id, t.tour_fid, t.date, t.tour_start, t.tour_end, dur,
                t.vehicle_id, t.vehicle_driver_id, t.organization_id
            ];
            tourCsv.push(values.map((v) => SightingsForR._cell(v)).join(','));
        }

        const zip = new JSZip();
        zip.file('sightings.csv', `${sightingCsv.join('\n')}\n`);
        zip.file('tours.csv', `${tourCsv.join('\n')}\n`);
        zip.file('README.txt', SightingsForR._readme(nowIso, sightingRows.length, tourRows.length));

        return zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'});
    }

    /**
     * Format one CSV cell: null/undefined → empty, numbers verbatim, strings
     * quoted when they contain a comma/quote/newline (doubling inner quotes).
     * @private
     */
    private static _cell(value: string | number | null | undefined): string {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'number') {
            return Number.isFinite(value) ? `${value}` : '';
        }
        const s = `${value}`;
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
            return `"${s.replace(/"/gu, '""')}"`;
        }
        return s;
    }

    /**
     * Parse [lon, lat] from the location_begin JSON blob, or null.
     * @private
     */
    private static _parseLonLat(location: string | null | undefined): [number, number] | null {
        if (!location || location === '' || location === 'null') {
            return null;
        }
        try {
            const p = JSON.parse(location) as {longitude?: number; latitude?: number;};
            if (typeof p.longitude !== 'number' || typeof p.latitude !== 'number') {
                return null;
            }
            if (!Number.isFinite(p.longitude) || !Number.isFinite(p.latitude)) {
                return null;
            }
            return [p.longitude, p.latitude];
        } catch {
            return null;
        }
    }

    /**
     * Strip any seconds off an HH:mm[:ss] clock string; '' stays ''.
     * @private
     */
    private static _hhmm(raw: string | null | undefined): string {
        const m = (raw ?? '').match(/^(\d{1,2}):(\d{2})/u);
        return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
    }

    /**
     * `${year}-${month}` key (month un-padded) for the climate-index join, or
     * '' when the date isn't parseable. Matches ClimateIndexService._key.
     * @private
     */
    private static _ymKey(date: string | null | undefined): string {
        const s = (date ?? '').trim();
        const year = parseInt(s.slice(0, 4), 10);
        const month = parseInt(s.slice(5, 7), 10);
        if (!Number.isInteger(year) || !(month >= 1 && month <= 12)) {
            return '';
        }
        return `${year}-${month}`;
    }

    /**
     * Coerce the legacy distance_coast varchar to a finite number, or '' .
     * @private
     */
    private static _numOrEmpty(raw: string | null | undefined): number | null {
        const n = parseFloat(raw ?? '');
        return Number.isFinite(n) && n >= 0 ? n : null;
    }

    /**
     * README text shipped in the ZIP.
     * @private
     */
    private static _readme(nowIso: string, nSightings: number, nTours: number): string {
        return [
            'MWPA sightings export for R',
            `Generated: ${nowIso}`,
            `Rows: sightings.csv = ${nSightings}, tours.csv = ${nTours}`,
            '',
            'FILES',
            '  sightings.csv  one row per sighting (response + environmental covariates)',
            '  tours.csv      one row per survey tour (effort + random-effect grouping)',
            '',
            'PSEUDO-REPLICATION',
            '  Sightings on the same tour share boat, crew and weather, so they are NOT',
            '  independent. Treat the tour as a random effect; do not model sightings as',
            '  if each were an independent sample. Join key: tour_fid.',
            '',
            'EXAMPLES (R)',
            '  library(lme4)',
            '  s <- read.csv("sightings.csv")',
            '  # group size vs SST + depth, tour as random intercept:',
            '  glmer(group_size ~ scale(sst_c_day) + scale(depth_m) + (1 | tour_fid),',
            '        data = s, family = poisson)',
            '',
            '  # effort-corrected: join tour duration for an offset / SPUE',
            '  t <- read.csv("tours.csv")',
            '',
            'NOTES',
            '  Empty cells are missing values (read.csv -> NA). Coordinates are WGS84',
            '  decimal degrees. Env covariates (*_day) come from the enrichment tables',
            '  and may be NA when a lookup had no data for that sighting.',
            '  nao / amo / oni are the monthly NAO / AMO / ONI climate indices for the',
            '  sighting\'s calendar month (same value for every sighting in that month).',
            ''
        ].join('\n');
    }

}