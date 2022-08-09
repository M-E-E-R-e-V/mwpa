import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * ToursFilter
 */
export type ToursFilter = {
    year?: number;
    limit?: number;
    offset?: number;
};

/**
 * TourEntry
 */
export type TourEntry = {

};

/**
 * ToursResponse
 */
export type ToursResponse = {
    status: string;
    error?: string;
    filter?: ToursFilter;
    offset: number;
    count: number;
    list: TourEntry[];
};

@JsonController()
export class Tours {

    /**
     * getList
     * @param session
     */
    @Post('/json/tours/list')
    public async getList(@Body() filter: ToursFilter, @Session() session: any): Promise<ToursResponse> {
        let status = 'ok';
        let errormsg = '';
        let count = 0;
        const rlist: TourEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            count = await MariaDbHelper.getConnection()
            .getRepository(SightingTourDB).count();


        } else {
            status = 'error';
            errormsg = 'Please login!';
        }

        return {
            status,
            error: errormsg,
            filter,
            count,
            offset: filter.offset ? filter.offset : 0,
            list: rlist
        };
    }

}