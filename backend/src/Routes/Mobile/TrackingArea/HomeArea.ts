import {TrackingAreaHomeResponse} from 'mwpa_schemas';
import {MobileV1StatusCode} from '../MobileV1.js';
import {TrackingAreaType} from '../../../Db/MariaDb/Entities/OrganizationTrackingArea.js';
import {OrganizationTrackingAreaRepository} from '../../../Db/MariaDb/Repositories/OrganizationTrackingAreaRepository.js';

type FeatureCollection = {
    type: string;
    features: {
        type: string;
        geometry: {
            type: string;
            coordinates: number[][][];
        };
    }[];
};

/**
 * HomeArea
 */
export class HomeArea {

    /**
     * Return the home tracking area polygon for the session user's main organization,
     * unwrapping the GeoJSON FeatureCollection down to the first polygon's outer ring.
     * @param {number} mainOrganizationId
     * @return {TrackingAreaHomeResponse}
     */
    public static async getHomeArea(mainOrganizationId: number): Promise<TrackingAreaHomeResponse> {
        if (mainOrganizationId === 0) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Home Area not found!'
            };
        }

        const ota = await OrganizationTrackingAreaRepository.getInstance().findByOrganizationAndType(
            mainOrganizationId,
            TrackingAreaType.HOME
        );

        if (!ota) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Home Area not found!'
            };
        }

        let data: FeatureCollection;
        try {
            data = JSON.parse(ota.geojsonstr) as FeatureCollection;
        } catch {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Data decode error!'
            };
        }

        if (!data || data.type !== 'FeatureCollection' || data.features.length === 0) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'FeatureCollection object not found!'
            };
        }

        const collection = data.features[0];
        if (collection.type !== 'Feature') {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Feature object not found!'
            };
        }

        const geometry = collection.geometry;
        if (geometry.type !== 'Polygon') {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Polygon object not found!'
            };
        }

        return {
            statusCode: MobileV1StatusCode.OK,
            data: {
                coordinates: geometry.coordinates[0],
                organization_id: ota.organization_id,
                create_datetime: ota.create_datetime,
                update_datetime: ota.update_datetime
            }
        };
    }

}