import * as bcrypt from 'bcrypt';
import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {UserData} from 'mwpa_schemas';
import {User as UserDB} from '../../../Db/MariaDb/Entities/User.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * Save
 */
export class Save {

    /**
     * Insert or update a user. Caller must verify admin role.
     * Password and pin are only updated when both fields and their *_repeat partners are set and match.
     * @param {UserData} entry
     * @return {DefaultReturn}
     */
    public static async saveUser(entry?: UserData): Promise<DefaultReturn> {
        if (Vts.isUndefined(entry)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        let user: UserDB|null = null;

        if (entry.id !== 0) {
            user = await UserRepository.getInstance().findOne(entry.id);
        }

        if (user === null) {
            user = new UserDB();
        }

        user.username = entry.username;
        user.full_name = entry.fullname;
        user.email = entry.email;

        if (entry.password && entry.password_repeat) {
            if (entry.password === '') {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Password is empty!'
                };
            }

            if (entry.password !== entry.password_repeat) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Password repeat is different!'
                };
            }

            user.password = await bcrypt.hash(entry.password, 10);
        }

        if (entry.pin && entry.pin_repeat) {
            if (entry.pin === '') {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Pin is empty!'
                };
            }

            if (entry.pin !== entry.pin_repeat) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Pin repeat is different!'
                };
            }

            user.pin = await bcrypt.hash(entry.pin, 10);
        }

        user.main_groupid = entry.main_groupid;
        user.isAdmin = entry.isAdmin;
        user.disable = entry.disable;

        await UserRepository.getInstance().save(user);

        return {
            statusCode: StatusCodes.OK
        };
    }

}