import {Request, Response, Router} from 'express';
import {ACL, DefaultRoute, RouteError} from '@stefanwerfling/figtree';
import {StatusCodes} from 'figtree-schemas';
import {
    BehaviouralStatesResponse,
    EncounterCategoriesResponse,
    MWPASessionUserData,
    OrganizationResponse,
    OrganizationUserListResponse,
    RightAnalytics,
    RightExternalTours,
    RightSightings,
    RightTours,
    SchemaBehaviouralStatesResponse,
    SchemaEncounterCategoriesResponse,
    SchemaMWPASessionData,
    SchemaOrganizationGetRequest,
    SchemaOrganizationResponse,
    SchemaOrganizationUserListResponse,
    SchemaSpeciesListResponse,
    SchemaVehicleDriverListResponse,
    SchemaVehicleListResponse,
    SpeciesListResponse,
    VehicleDriverListResponse,
    VehicleListResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {List as BehaviouralStatesList} from './BehaviouralStates/List.js';
import {List as EncounterCategoriesList} from './EncounterCategories/List.js';
import {Get as OrganizationGet} from './Organization/Get.js';
import {UserList as OrganizationUserList} from './Organization/UserList.js';
import {List as SpeciesList} from './Species/List.js';
import {List as VehicleDriverList} from './VehicleDriver/List.js';
import {List as VehicleList} from './Vehicle/List.js';

/**
 * Read-only master-data lookups for the working pages (sightings, tours,
 * analytics). Same handlers + response schemas as the `/json/<x>/list`
 * routes, but gated on "may use a working page" instead of the master-data
 * read rights (`species_read`, `vehicles_read`, `catalog_read`,
 * `organizations_read`). So a role only needs e.g. `sightings_read` to see
 * species / vehicle / driver / encounter names in the sighting list — the
 * master-data rights stay for the Admin pages, which keep using `/list`.
 */
export class Lookup extends DefaultRoute {

    /**
     * Any of these rights unlocks the lookups.
     */
    public static readonly LOOKUP_RIGHTS: string[] = [
        RightSightings.sightings_read,
        RightTours.tours_read,
        RightAnalytics.analytics_read,
        RightExternalTours.external_tours_read
    ];

    /**
     * Login + "has any of LOOKUP_RIGHTS" check (figtree's aclRight only takes
     * one right). false → 401 when not logged in, RouteError → 403 when
     * logged in but none of the rights is granted.
     * @param {Request} req
     * @param {Response} res
     * @return {Promise<boolean>}
     */
    public static async checkAccess(req: Request, res: Response): Promise<boolean> {
        return Lookup.checkAnyRight(req, res, Lookup.LOOKUP_RIGHTS);
    }

    /**
     * Login + "has any of the given rights" check.
     * @param {Request} req
     * @param {Response} res
     * @param {string[]} anyOf
     * @return {Promise<boolean>}
     */
    public static async checkAnyRight(req: Request, res: Response, anyOf: string[]): Promise<boolean> {
        if (!await checkMWPAUserIsLogin(req, res)) {
            return false;
        }

        const user = (req.session as unknown as {user?: MWPASessionUserData;}).user;
        const role = user?.role ?? '';
        const rights = user?.rights ?? [];

        if (role !== '') {
            for (const right of anyOf) {
                // eslint-disable-next-line no-await-in-loop
                if (await ACL.getInstance().checkAccess(role, right, rights)) {
                    return true;
                }
            }
        }

        throw new RouteError(StatusCodes.FORBIDDEN, 'User has no access!');
    }

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        const description = 'Read-only lookup for the sighting/tour/analytics pages (needs sightings_read, tours_read, analytics_read or external_tours_read).';

        this._get(
            '/json/lookup/species',
            Lookup.checkAccess,
            async(): Promise<SpeciesListResponse> => SpeciesList.getList(),
            {
                description: `Species list. ${description}`,
                responseBodySchema: SchemaSpeciesListResponse
            }
        );

        this._get(
            '/json/lookup/vehicles',
            Lookup.checkAccess,
            async(): Promise<VehicleListResponse> => VehicleList.getList(),
            {
                description: `Vehicle list. ${description}`,
                responseBodySchema: SchemaVehicleListResponse
            }
        );

        this._get(
            '/json/lookup/vehicledrivers',
            Lookup.checkAccess,
            async(): Promise<VehicleDriverListResponse> => VehicleDriverList.getList(),
            {
                description: `Vehicle driver list. ${description}`,
                responseBodySchema: SchemaVehicleDriverListResponse
            }
        );

        this._get(
            '/json/lookup/encountercategories',
            Lookup.checkAccess,
            async(): Promise<EncounterCategoriesResponse> => EncounterCategoriesList.getList(),
            {
                description: `Encounter category list. ${description}`,
                responseBodySchema: SchemaEncounterCategoriesResponse
            }
        );

        this._get(
            '/json/lookup/behaviouralstates',
            Lookup.checkAccess,
            async(): Promise<BehaviouralStatesResponse> => BehaviouralStatesList.getList(),
            {
                description: `Behavioural state list. ${description}`,
                responseBodySchema: SchemaBehaviouralStatesResponse
            }
        );

        this._get(
            '/json/lookup/organizations',
            Lookup.checkAccess,
            async(_req, _res, data): Promise<OrganizationUserListResponse> => {
                const sessionUser = data.session?.user;
                return OrganizationUserList.getList(sessionUser?.userid ?? 0, sessionUser?.isAdmin ?? false);
            },
            {
                description: `Organizations of the session user (admins: all). ${description}`,
                responseBodySchema: SchemaOrganizationUserListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/lookup/organization',
            Lookup.checkAccess,
            async(_req, _res, data): Promise<OrganizationResponse> => {
                const sessionUser = data.session?.user;
                return OrganizationGet.getOrganization(sessionUser?.userid ?? 0, sessionUser?.isAdmin ?? false, data.body);
            },
            {
                description: `One organization by id, scoped to the caller's organizations for non-admins. ${description}`,
                bodySchema: SchemaOrganizationGetRequest,
                responseBodySchema: SchemaOrganizationResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}
