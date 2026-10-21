import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {DefaultHandlerReturn, HandlerResultType} from 'figtree-schemas';
import {SchemaMWPASessionData} from 'mwpa_schemas';
import {Users} from '../../Users/Users.js';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {DarwinCoreArchive} from './DarwinCore/BuildArchive.js';

/**
 * Darwin Core Archive export.
 *
 * GET `/json/export/dwca` streams a DwC-A ZIP (Occurrence core + meta.xml +
 * eml.xml) ready for OBIS / GBIF ingestion. Kept as a GET without a body so
 * the frontend's plain-GET download flow can reach it. Non-admins are scoped
 * to their own organisations (same rule as the sightings list); admins export
 * the full dataset.
 */
export class DarwinCore extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/export/dwca',
            checkMWPAUserIsLogin,
            async(req, res, data): Promise<DefaultHandlerReturn> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                const organizationIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);

                const nowIso = new Date().toISOString();
                const buffer = await DarwinCoreArchive.build({
                    organizationIds: organizationIds,
                    nowIso: nowIso
                });

                const filename = `mwpa_occurrence_${nowIso.slice(0, 10)}.zip`;
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', `${buffer.length}`);
                res.end(buffer);

                return {type: HandlerResultType.handled};
            },
            {
                description: 'Download a Darwin Core Archive (ZIP: occurrence core + meta.xml + eml.xml) '
                    + 'of the sightings for OBIS / GBIF. Non-admins are scoped to their organisations; '
                    + 'admins export the full dataset.',
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}