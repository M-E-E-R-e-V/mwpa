import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {StatusCodes} from 'figtree-schemas';
import {SchemaMWPASessionData} from 'mwpa_schemas';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {CreateExport} from './OfficeReport/CreateExport.js';

const TEMPLATE_DOWNLOAD_NAME = 'AVISTAMIENTOS_EIDOS_PLANTILLA_AROC_MEER.xlsm';

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
            '/json/officereport/create_export',
            checkMWPAUserIsLogin,
            async(req, res, data) => {
                if (!data.session?.user?.isAdmin) {
                    res.status(parseInt(StatusCodes.FORBIDDEN, 10)).send('Forbidden');
                    return;
                }

                const externalReceiverIdRaw = req.query.external_receiver_id;
                const externalReceiverId = typeof externalReceiverIdRaw === 'string'
                    ? parseInt(externalReceiverIdRaw, 10)
                    : 0;

                const buffer = await CreateExport.createExport({
                    external_receiver_id: Number.isFinite(externalReceiverId) ? externalReceiverId : 0
                });

                if (buffer === null) {
                    res.status(parseInt(StatusCodes.INTERNAL_ERROR, 10)).send('Report generation failed');
                    return;
                }

                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${TEMPLATE_DOWNLOAD_NAME}"`);
                res.end(buffer);
            },
            {
                description: 'Generate the AROC office-report XLSX. Admin only. Optional ?external_receiver_id=<id> (default 1).',
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
