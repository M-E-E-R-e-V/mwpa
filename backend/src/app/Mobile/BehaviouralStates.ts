import {Get, JsonController, Session} from 'routing-controllers';
import {BehaviouralStates as MainBehaviouralStates, BehaviouralStatesResponse} from '../Main/BehaviouralStates';

/**
 * BehaviouralStates
 */
@JsonController()
export class BehaviouralStates extends MainBehaviouralStates {

    /**
     * getList
     * @param session
     */
    @Get('/mobile/behaviouralstates/list')
    public async getList(@Session() session: any): Promise<BehaviouralStatesResponse> {
        return super.getList(session);
    }

}