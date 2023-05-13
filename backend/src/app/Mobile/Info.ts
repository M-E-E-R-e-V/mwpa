import {Get, JsonController} from 'routing-controllers';
import {Const} from '../../inc/Const';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * InfoResponse
 */
export type InfoResponse = DefaultReturn & {
    version_api_login?: string;
    version_api_sync?: string;
};

/**
 * Info
 */
@JsonController()
export class Info {

    /**
     * getInfo
     */
    @Get('/mobile/info')
    public async getInfo(): Promise<InfoResponse> {
        return {
            statusCode: StatusCodes.OK,
            version_api_login: Const.VERSION_API_MOBILE_LOGIN,
            version_api_sync: Const.VERSION_API_MOBILE_SYNC
        };
    }

}