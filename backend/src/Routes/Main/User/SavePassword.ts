import * as bcrypt from 'bcrypt';
import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {UserSavePasswordRequest} from 'mwpa_schemas';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * SavePassword
 */
export class SavePassword {

    /**
     * Update the password of the session user.
     * @param {number} userId
     * @param {UserSavePasswordRequest} request
     * @return {DefaultReturn}
     */
    public static async savePassword(userId: number, request?: UserSavePasswordRequest): Promise<DefaultReturn> {
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

        if (request.password !== request.repeatpassword) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'The repeat password is differend!'
            };
        }

        user.password = await bcrypt.hash(request.password, 10);
        await UserRepository.getInstance().save(user);

        return {
            statusCode: StatusCodes.OK
        };
    }

}