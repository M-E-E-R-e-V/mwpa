import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    ProtectedAreaResponse,
    RightSightings,
    SchemaMWPASessionData,
    SchemaProtectedAreaResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {ProtectedAreaList} from './ProtectedArea/ProtectedAreaList.js';

/**
 * Protected areas (Natura 2000) for the sighting map.
 */
export class ProtectedArea extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/protectedarea/list',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<ProtectedAreaResponse> => {
                const user = data.session?.user;
                const organizationId = await ProtectedAreaList.organizationOf(
                    user?.main_organization_id ?? 0,
                    user?.organizations ?? [],
                    user?.isAdmin ?? false
                );

                return ProtectedAreaList.get(organizationId);
            },
            {
                aclRight: RightSightings.sightings_read,
                description: 'Natura 2000 sites (EEA) around the home area of the user\'s organization + 60 km, as GeoJSON string. Loaded in the background and cached; "pending" until loaded.',
                responseBodySchema: SchemaProtectedAreaResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}