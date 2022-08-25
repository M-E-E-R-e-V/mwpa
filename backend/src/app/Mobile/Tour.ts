import {JsonController, Session} from 'routing-controllers';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * OpenTour
 */
export type OpenTour = {
    id: number;
    start_date: number;
    end_date: number;
    vehicle_driver: {
        id: number;
        description: string;
    };
    vehicle: {
        id: number;
        description: string;
    };
    organization: {
        id: number;
        description: string;
        country: string;
        location: string;
        lat: string;
        lon: string;
    };
};

export type OpenTourResponse = DefaultReturn & {
    data?: OpenTour;
};

/**
 * Tour
 */
@JsonController()
export class Tour {

    /**
     * getOpenTour
     * @param session
     */
    public async getOpenTour(@Session() session: any): Promise<OpenTourResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            // todo

            return {
                statusCode: StatusCodes.OK
                // todo
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}