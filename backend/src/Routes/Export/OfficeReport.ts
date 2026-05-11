import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {DefaultHandlerReturn, HandlerResultType, StatusCodes} from 'figtree-schemas';
import {In} from 'typeorm';
import {
    ExternalReceiverListResponse,
    SchemaExternalReceiverListResponse,
    SchemaMWPASessionData,
    SchemaVehicleListResponse,
    VehicleListResponse
} from 'mwpa_schemas';
import {ExternalReceiverRepository} from '../../Db/MariaDb/Repositories/ExternalReceiverRepository.js';
import {SightingRepository} from '../../Db/MariaDb/Repositories/SightingRepository.js';
import {VehicleRepository} from '../../Db/MariaDb/Repositories/VehicleRepository.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {CreateExport} from './OfficeReport/CreateExport.js';

const TEMPLATE_DOWNLOAD_NAME = 'PLANTILLA_AVISTAMIENTOS_AROC_MEER.xlsx';

/**
 * Map (year, semester) to an inclusive YYYY-MM-DD range. Mirrors the helper
 * inside CreateExport so the boat picker scopes to the same period the
 * report itself will scope to.
 */
function dateRangeFor(year: number, semester: number | undefined): {from: string; to: string} | null {
    if (year <= 0) {
        return null;
    }
    if (semester === 1) {
        return {from: `${year}-01-01`, to: `${year}-06-30`};
    }
    if (semester === 2) {
        return {from: `${year}-07-01`, to: `${year}-12-31`};
    }
    return {from: `${year}-01-01`, to: `${year}-12-31`};
}

/**
 * OfficeReport
 *
 * NOTE: kept as GET (without body) to preserve the frontend download flow
 * (`UtilDownload.download(url)` issues a plain GET). Filter values are read
 * from the query string instead of a JSON body — that's the only practical
 * way to forward parameters with a browser-driven download.
 */
export class OfficeReport extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/officereport/receivers',
            checkMWPAUserIsLogin,
            async(): Promise<ExternalReceiverListResponse> => {
                const rows = await ExternalReceiverRepository.getInstance().findAllOrdered();
                return {
                    statusCode: StatusCodes.OK,
                    list: rows.map((r) => ({id: r.id, name: r.name}))
                };
            },
            {
                description: 'List of external receivers (id+name) — fills the AROC-report receiver picker.',
                responseBodySchema: SchemaExternalReceiverListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/officereport/used_vehicles',
            checkMWPAUserIsLogin,
            async(req): Promise<VehicleListResponse> => {
                const yearRaw = req.query.year;
                const year = typeof yearRaw === 'string' ? parseInt(yearRaw, 10) : NaN;

                const semesterRaw = req.query.semester;
                const semester = typeof semesterRaw === 'string' ? parseInt(semesterRaw, 10) : NaN;

                const organizationIdRaw = req.query.organization_id;
                const organizationId = typeof organizationIdRaw === 'string'
                    ? parseInt(organizationIdRaw, 10)
                    : NaN;

                const semesterVal = semester === 1 || semester === 2 ? semester : undefined;
                const range = Number.isFinite(year) && year > 0
                    ? dateRangeFor(year, semesterVal)
                    : null;
                const orgVal = Number.isFinite(organizationId) && organizationId > 0
                    ? organizationId
                    : undefined;

                const usedIds = await SightingRepository.getInstance().findUsedVehicleIds(
                    range?.from,
                    range?.to,
                    orgVal
                );

                if (usedIds.length === 0) {
                    return {statusCode: StatusCodes.OK, list: []};
                }

                const vehicleRepo = await VehicleRepository.getInstance().getRepository();
                const vehicles = await vehicleRepo.find({
                    where: {id: In(usedIds)}
                });

                return {
                    statusCode: StatusCodes.OK,
                    list: vehicles.map((v) => ({
                        id: v.id,
                        name: v.description,
                        isdeleted: v.isdeleted,
                        organization_id: v.organization_id,
                        in_use: v.in_use
                    }))
                };
            },
            {
                description: 'List of vehicles that have at least one non-deleted sighting in the given'
                    + ' year/semester/organization. Optional ?year=<YYYY>, ?semester=1|2,'
                    + ' ?organization_id=<id>. Empty filters return every vehicle with any sighting.',
                responseBodySchema: SchemaVehicleListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/officereport/create_export',
            checkMWPAUserIsLogin,
            async(req, res, data): Promise<DefaultHandlerReturn> => {
                if (!data.session?.user?.isAdmin) {
                    res.status(parseInt(StatusCodes.FORBIDDEN, 10)).send('Forbidden');
                    return {type: HandlerResultType.handled};
                }

                const externalReceiverIdRaw = req.query.external_receiver_id;
                const externalReceiverId = typeof externalReceiverIdRaw === 'string'
                    ? parseInt(externalReceiverIdRaw, 10)
                    : 0;

                const yearRaw = req.query.year;
                const year = typeof yearRaw === 'string' ? parseInt(yearRaw, 10) : NaN;

                const vehicleIdRaw = req.query.vehicle_id;
                const vehicleId = typeof vehicleIdRaw === 'string' ? parseInt(vehicleIdRaw, 10) : NaN;

                const organizationIdRaw = req.query.organization_id;
                const organizationId = typeof organizationIdRaw === 'string'
                    ? parseInt(organizationIdRaw, 10)
                    : NaN;

                const semesterRaw = req.query.semester;
                const semester = typeof semesterRaw === 'string' ? parseInt(semesterRaw, 10) : NaN;

                const buffer = await CreateExport.createExport({
                    external_receiver_id: Number.isFinite(externalReceiverId) ? externalReceiverId : 0,
                    year: Number.isFinite(year) && year > 0 ? year : undefined,
                    vehicle_id: Number.isFinite(vehicleId) && vehicleId > 0 ? vehicleId : undefined,
                    organization_id: Number.isFinite(organizationId) && organizationId > 0
                        ? organizationId
                        : undefined,
                    semester: semester === 1 || semester === 2 ? semester : undefined
                });

                if (buffer === null) {
                    res.status(parseInt(StatusCodes.INTERNAL_ERROR, 10)).send('Report generation failed');
                    return {type: HandlerResultType.handled};
                }

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${TEMPLATE_DOWNLOAD_NAME}"`);
                res.setHeader('Content-Length', `${buffer.length}`);
                res.end(buffer);
                return {type: HandlerResultType.handled};
            },
            {
                description: 'Generate the AROC office-report XLSX. Admin only.'
                    + ' Optional ?external_receiver_id=<id> (default 1),'
                    + ' optional ?year=<YYYY>, optional ?vehicle_id=<id> (1 file per boat),'
                    + ' optional ?organization_id=<id>,'
                    + ' optional ?semester=1|2 (1 = Jan–Jun, 2 = Jul–Dec).',
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
