import * as bcrypt from 'bcrypt';
import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {UserSavePinRequest} from 'mwpa_schemas';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * SavePin
 */
export class SavePin {

    /**
     * Update the mobile pin of the session user.
     * @param {number} userId
     * @param {UserSavePinRequest} request
     * @return {DefaultReturn}
     */
    public static async savePin(userId: number, request?: UserSavePinRequest): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const user = await UserRepository.getInstance().findOne(userId);

        if (!user) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'User not found by session-user-id!'
            };
        }

        if (request.pin !== request.repeatpin) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'The repeat pin is differend!'
            };
        }

        user.pin = await bcrypt.hash(request.pin, 10);
        await UserRepository.getInstance().save(user);

        return {
            statusCode: StatusCodes.OK
        };
    }

}