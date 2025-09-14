import {In} from 'typeorm';
import {Group as GroupDB} from '../../Db/MariaDb/Entities/Group.js';
import {Organization as OrganizationDB} from '../../Db/MariaDb/Entities/Organization.js';
import {User as UserDB} from '../../Db/MariaDb/Entities/User.js';
import {UserGroups as UserGroupsDB} from '../../Db/MariaDb/Entities/UserGroups.js';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';

/**
 * Users
 */
export class Users {

    /**
     * getUser
     * @param userId
     */
    public static async getUser(userId: number): Promise<UserDB | undefined> {
        const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

        return userRepository.findOne({
            where: {
                id: userId
            }
        });
    }

    /**
     * getMainGroup
     * @param userId
     */
    public static async getMainGroup(userId: number): Promise<GroupDB | undefined> {
        const user = await Users.getUser(userId);

        if (user) {
            const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);

            return groupRepository.findOne({
                where: {
                    id: user.id
                }
            });
        }

        return undefined;
    }

    /**
     * getMainOrganization
     * @param userId
     */
    public static async getMainOrganization(userId: number): Promise<OrganizationDB | undefined> {
        const mainGroup = await Users.getMainGroup(userId);

        if (mainGroup) {
            const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

            return organizationRepository.findOne({
                where: {
                    id: mainGroup.organization_id
                }
            });
        }

        return undefined;
    }

    /**
     * getGroupIds
     * @param userId
     */
    public static async getGroupIds(userId: number): Promise<number[]> {
        const groupIds: number[] = [];

        const user = await Users.getUser(userId);

        if (user) {
            groupIds.push(user.main_groupid);

            const userGroupsRepository = MariaDbHelper.getConnection().getRepository(UserGroupsDB);
            const userGroups = await userGroupsRepository.find({
                where: {
                    user_id: user.id
                }
            });

            for (const userGroup of userGroups) {
                groupIds.push(userGroup.group_id);
            }
        }

        return groupIds;
    }

    /**
     * getOrganizationIds
     * @param userId
     */
    public static async getOrganizationIds(userId: number): Promise<number[]> {
        const organizationIds: number[] = [];
        const groupIds = await Users.getGroupIds(userId);

        const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);
        const groups = await groupRepository.find({
            where: {
                id: In(groupIds)
            }
        });

        for (const group of groups) {
            organizationIds.push(group.organization_id);
        }

        return organizationIds;
    }

    /**
     * getOrganizations
     * @param userId
     */
    public static async getOrganizations(userId: number): Promise<OrganizationDB[]> {
        const organizationIds = await Users.getOrganizationIds(userId);

        const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

        return organizationRepository.find({
            where: {
                id: In(organizationIds)
            }
        });
    }

}