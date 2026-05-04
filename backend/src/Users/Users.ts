import {In} from 'typeorm';
import {Group as GroupDB} from '../Db/MariaDb/Entities/Group.js';
import {Organization as OrganizationDB} from '../Db/MariaDb/Entities/Organization.js';
import {GroupRepository} from '../Db/MariaDb/Repositories/GroupRepository.js';
import {OrganizationRepository} from '../Db/MariaDb/Repositories/OrganizationRepository.js';
import {UserGroupsRepository} from '../Db/MariaDb/Repositories/UserGroupsRepository.js';
import {UserRepository} from '../Db/MariaDb/Repositories/UserRepository.js';

/**
 * Users helper
 */
export class Users {

    /**
     * Return the main group of the user (matches old-backend semantics).
     * @param {number} userId
     * @return {GroupDB | null}
     */
    public static async getMainGroup(userId: number): Promise<GroupDB | null> {
        const user = await UserRepository.getInstance().findOne(userId);

        if (user) {
            return GroupRepository.getInstance().findOne(user.main_groupid);
        }

        return null;
    }

    /**
     * Return the main organization for the user via their main group.
     * @param {number} userId
     * @return {OrganizationDB | null}
     */
    public static async getMainOrganization(userId: number): Promise<OrganizationDB | null> {
        const mainGroup = await Users.getMainGroup(userId);

        if (mainGroup) {
            return OrganizationRepository.getInstance().findOne(mainGroup.organization_id);
        }

        return null;
    }

    /**
     * Return all group ids the user is a member of (main group + UserGroups).
     * @param {number} userId
     * @return {number[]}
     */
    public static async getGroupIds(userId: number): Promise<number[]> {
        const groupIds: number[] = [];
        const user = await UserRepository.getInstance().findOne(userId);

        if (user) {
            groupIds.push(user.main_groupid);

            const userGroups = await UserGroupsRepository.getInstance().findAllBy(user.id);

            for (const userGroup of userGroups) {
                groupIds.push(userGroup.group_id);
            }
        }

        return groupIds;
    }

    /**
     * Return all organization ids the user belongs to via their groups.
     * @param {number} userId
     * @return {number[]}
     */
    public static async getOrganizationIds(userId: number): Promise<number[]> {
        const organizationIds: number[] = [];
        const groupIds = await Users.getGroupIds(userId);

        if (groupIds.length === 0) {
            return organizationIds;
        }

        const groupRepository = await GroupRepository.getInstance().getRepository();
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
     * Return all organization entities the user belongs to.
     * @param {number} userId
     * @return {OrganizationDB[]}
     */
    public static async getOrganizations(userId: number): Promise<OrganizationDB[]> {
        const organizationIds = await Users.getOrganizationIds(userId);

        if (organizationIds.length === 0) {
            return [];
        }

        const organizationRepository = await OrganizationRepository.getInstance().getRepository();
        return organizationRepository.find({
            where: {
                id: In(organizationIds)
            }
        });
    }

}