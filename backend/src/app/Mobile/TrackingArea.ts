import {Get, JsonController, Session} from 'routing-controllers';
import {
    OrganizationTrackingArea as OrganizationTrackingAreaDB, TrackingAreaType
} from '../../inc/Db/MariaDb/Entity/OrganizationTrackingArea';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

export type FeatureCollectionCordinate = number[][];

export type FeatureCollection = {
    type: string;
    features: {
        type: string;
        geometry: {
            type: string;
            coordinates: FeatureCollectionCordinate[];
        };
    }[];
};

export type TrackingAreaHomeData = {
    coordinates: FeatureCollectionCordinate;
    organization_id: number;
};

export type TrackingAreaHomeResponse = DefaultReturn & {
    data?: TrackingAreaHomeData;
};

@JsonController()
export class TrackingArea {

    @Get('/mobile/trackingarea/homearea')
    public async getHomeArea(@Session() session: any): Promise<TrackingAreaHomeResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const otaRepository = MariaDbHelper.getConnection().getRepository(OrganizationTrackingAreaDB);

            let ota: OrganizationTrackingAreaDB | undefined;

            if (session.user.main_organization_id !== 0) {
                ota = await otaRepository.findOne({
                    where: {
                        organization_id: session.user.main_organization_id,
                        area_type: TrackingAreaType.HOME
                    }
                });
            }

            if (ota) {
                try {
                    const data = JSON.parse(ota.geojsonstr) as FeatureCollection;

                    if (data) {
                        if (data.type === 'FeatureCollection' && data.features.length > 0) {
                            const collection = data.features[0];

                            if (collection.type === 'Feature') {
                                const geometry = collection.geometry;

                                if (geometry.type === 'Polygon') {
                                    return {
                                        statusCode: StatusCodes.OK,
                                        data: {
                                            coordinates: geometry.coordinates[0],
                                            organization_id: ota.organization_id
                                        }
                                    };
                                }

                                return {
                                    statusCode: StatusCodes.INTERNAL_ERROR,
                                    msg: 'Polygon object not found!'
                                };
                            }

                            return {
                                statusCode: StatusCodes.INTERNAL_ERROR,
                                msg: 'Feature object not found!'
                            };
                        }

                        return {
                            statusCode: StatusCodes.INTERNAL_ERROR,
                            msg: 'FeatureCollection object not found!'
                        };
                    }

                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Data empty!'
                    };
                } catch (e) {
                    console.log(e);

                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Data decode error!'
                    };
                }
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Home Area not found!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}