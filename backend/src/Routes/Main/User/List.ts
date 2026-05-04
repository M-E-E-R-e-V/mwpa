import {StatusCodes} from 'figtree-schemas';
import {UserData, UserListFilter, UserListResponse} from 'mwpa_schemas';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return all users (admin only). Filter.show_disabled defaults to hiding disabled accounts.
     * Caller must verify admin role.
     * @param {UserListFilter} filter
     * @return {UserListResponse}
     */
    public static async getList(filter?: UserListFilter): Promise<UserListResponse> {
        const showDisabled = filter?.filter?.show_disabled === true;

        const repository = await UserRepository.getInstance().getRepository();
        const users = showDisabled
            ? await repository.find()
            : await repository.find({where: {disable: false}});

        const list: UserData[] = users.map((user) => ({
            id: user.id,
            username: user.username,
            fullname: user.full_name,
            email: user.email,
            isAdmin: user.isAdmin,
            main_groupid: user.main_groupid,
            password: '',
            disable: user.disable
        }));

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}