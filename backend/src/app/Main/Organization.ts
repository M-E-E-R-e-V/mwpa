import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {
    OrganizationTrackingArea as OrganizationTrackingAreaDB
} from '../../inc/Db/MariaDb/Entity/OrganizationTrackingArea';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {Users} from '../../inc/Users/Users';
import {DateHelper} from '../../inc/Utils/DateHelper';

/**
 * OrganizationEntry
 */
export type OrganizationEntry = {
    id: number;
    description: string;
};

/**
 * OrganizationUserListResponse
 */
export type OrganizationUserListResponse = DefaultReturn & {
    list?: OrganizationEntry[];
};

/**
 * OrganizationFullEntry
 */
export type OrganizationFullEntry = OrganizationEntry & {
    location: string;
    lat: string;
    lon: string;
    country: string;
};

/**
 * OrganizationListResponse
 */
export type OrganizationListResponse = DefaultReturn & {
    list?: OrganizationFullEntry[];
};

/**
 * Organization get request
 */
export type OrganizationGetRequest = {
    id: number;
};

/**
 * Organization response
 */
export type OrganizationResponse = DefaultReturn & {
    data?: OrganizationFullEntry;
};

/**
 * OrganizationTrackingAreaRequest
 */
export type OrganizationTrackingAreaRequest = {
    id?: number;
    organization?: {
        organization_id: number;
        area_type: string;
    };
};

/**
 * Organization tracking area entry
 */
export type OrganizationTrackingAreaEntry = {
    id: number;
    organization_id: number;
    area_type: string;
    geojsonstr: string;
};

/**
 * OrganizationTrackingAreaRespose
 */
export type OrganizationTrackingAreaRespose = DefaultReturn & {
    data?: OrganizationTrackingAreaEntry;
};

/**
 * Organization
 */
@JsonController()
export class Organization {

    /**
     * getOrganizationByUser
     * @param session
     */
    @Get('/json/organization/userlist')
    public async getOrganizationByUser(@Session() session: any): Promise<OrganizationUserListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            let orgs: OrganizationDB[] = [];

            if (session.user.isAdmin) {
                const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

                orgs = await organizationRepository.find();
            } else {
                orgs = await Users.getOrganizations(session.user.userid);
            }


            const list: OrganizationEntry[] = [];

            for (const org of orgs) {
                list.push({
                    id: org.id,
                    description: org.description
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getOrganizations
     * @param session
     */
    @Get('/json/organization/list')
    public async getOrganizations(@Session() session: any): Promise<OrganizationListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

            const orgs = await organizationRepository.find();

            const list: OrganizationFullEntry[] = [];

            for (const org of orgs) {
                list.push({
                    id: org.id,
                    description: org.description,
                    location: org.location,
                    lat: org.lat,
                    lon: org.lon,
                    country: org.country
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * Get organization
     * @param {any} session
     * @param {OrganizationGetRequest} req
     * @return {OrganizationResponse}
     */
    @Post('/json/organization/get')
    public async getOrganization(@Session() session: any, @Body() req: OrganizationGetRequest): Promise<OrganizationResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

            const org = await organizationRepository.findOne({
                where: {
                    id: req.id
                }
            });

            if (org) {
                return {
                    statusCode: StatusCodes.OK,
                    data: {
                        id: org.id,
                        description: org.description,
                        location: org.location,
                        lat: org.lat,
                        lon: org.lon,
                        country: org.country
                    }
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Organization not found!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * Save Organization
     * @param session
     * @param req
     */
    @Post('/json/organization/save')
    public async saveOrganization(@Session() session: any, @Body() req: OrganizationFullEntry): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);
            let org: OrganizationDB|null = null;

            if (req.id !== 0) {
                const torg = await organizationRepository.findOne({
                    where: {
                        id: req.id
                    }
                });

                if (torg) {
                    org = torg;
                }
            }

            if (org === null) {
                org = new OrganizationDB();
            }

            org.description = req.description;
            org.country = req.country;
            org.location = req.location;
            org.lat = req.lat;
            org.lon = req.lon;

            await organizationRepository.save(org);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getTrackingArea
     * @param session
     */
    @Post('/json/organization/trackingarea/list')
    public async getTrackingArea(@Session() session: any, @Body() req: OrganizationTrackingAreaRequest): Promise<OrganizationTrackingAreaRespose> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const otaRepository = MariaDbHelper.getConnection().getRepository(OrganizationTrackingAreaDB);
            let ota: OrganizationTrackingAreaDB|undefined;

            if (req.id) {
                ota = await otaRepository.findOne({
                    where: {
                        id: req.id
                    }
                });
            } else if (req.organization) {
                ota = await otaRepository.findOne({
                    where: {
                        organization_id: req.organization.organization_id,
                        area_type: req.organization.area_type
                    }
                });
            }


            if (ota) {
                return {
                    statusCode: StatusCodes.OK,
                    data: {
                        id: ota.id,
                        area_type: ota.area_type,
                        organization_id: ota.organization_id,
                        geojsonstr: ota.geojsonstr
                    }
                };
            }

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * saveTrackingArea
     * @param session
     * @param {OrganizationTrackingAreaEntry} req
     */
    @Post('/json/organization/trackingarea/save')
    public async saveTrackingArea(@Session() session: any, @Body() req: OrganizationTrackingAreaEntry): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const otaRepository = MariaDbHelper.getConnection().getRepository(OrganizationTrackingAreaDB);
            let ota: OrganizationTrackingAreaDB|null = null;

            if (req.id !== 0) {
                const tota = await otaRepository.findOne({
                    where: {
                        id: req.id
                    }
                });

                if (tota) {
                    ota = tota;
                }
            }

            const ctime = DateHelper.getCurrentDbTime();

            if (ota === null) {
                ota = new OrganizationTrackingAreaDB();
                ota.create_datetime = ctime;
            }

            if (ota.create_datetime === 0) {
                ota.create_datetime = ctime;
            }

            ota.update_datetime = ctime;

            ota.organization_id = req.organization_id;
            ota.area_type = req.area_type;
            ota.geojsonstr = req.geojsonstr;

            await otaRepository.save(ota);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}