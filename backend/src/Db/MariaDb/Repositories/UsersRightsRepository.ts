import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {UsersRights} from '../Entities/UsersRights.js';

/**
 * Users rights repository
 */
export class UsersRightsRepository extends DBRepository<UsersRights> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'usersrights';

    /**
     * Return an instance of users rights repository
     * @returns {UsersRightsRepository}
     */
    public static getInstance(): UsersRightsRepository {
        return super.getSingleInstance(UsersRights);
    }

    public async findList(rightsList: number[]): Promise<UsersRights[]> {
        const repository = await this._repository;
        if (rightsList.length === 0) {
            return [];
        }
        return repository.find({
            where: {
                id: In(rightsList)
            }
        });
    }

    public async findByKey(key: string): Promise<UsersRights | null> {
        const repository = await this._repository;
        return repository.findOne({where: {key: key}});
    }

    public async hasRight(key: string): Promise<boolean> {
        return await this.findByKey(key) !== null;
    }

}