import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * SightingsFilter
 */
export type UserListFilter = {
    filter?: {
        show_disabled?: boolean;
    };
    limit?: number;
    offset?: number;
};

/**
 * UserInfoData
 */
export type UserInfoData = {
    id: number;
    username: string;
    fullname: string;
    email: string;
    isAdmin: boolean;
};

/**
 * UserInfoGroup
 */
export type UserInfoGroup = {
    name: string;
    id: number;
};

/**
 * UserInfoOrg
 */
export type UserInfoOrg = {
    name: string;
    id: number;
};

/**
 * UserInfo
 */
export type UserInfo = {
    islogin: boolean;
    user?: UserInfoData;
    group?: UserInfoGroup;
    organization?: UserInfoOrg;
};

/**
 * UserData
 */
export type UserData = UserInfoData & {
    main_groupid: number;
    password?: string;
    password_repeat?: string;
    pin?: string;
    pin_repeat?: string;
    disable: boolean;
};

/**
 * UserListResponse
 */
export type UserListResponse = DefaultReturn & {
    list?: UserData[];
};

/**
 * UserSavePassword
 */
export type UserSavePassword = {
    password: string;
    repeatpassword: string;
};

/**
 * UserSavePin
 */
export type UserSavePin = {
    pin: string;
    repeatpin: string;
};

/**
 * User
 */
export class User {

    /**
     * getCurrentUser
     */
    public static async getUserInfo(): Promise<UserInfo | null> {
        const result = await NetFetch.getData('/json/user/info');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.data as UserInfo;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * getUserList
     * @param {UserListFilter} filter
     * @returns {UserData[] | null}
     */
    public static async getUserList(filter: UserListFilter): Promise<UserData[] | null> {
        const result = await NetFetch.postData('/json/user/list', filter);

        if (result && result.statusCode) {
            const tresult = result as UserListResponse;

            switch (result.statusCode) {
                case StatusCodes.OK:
                    if (tresult.list) {
                        return tresult.list;
                    }

                    throw new Error('Userlist is empty return!');

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * save
     * @param user
     */
    public static async save(user: UserData): Promise<boolean> {
        const result = await NetFetch.postData('/json/user/save', user);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                case StatusCodes.INTERNAL_ERROR:
                    throw new Error(result.msg);
            }
        }

        return false;
    }

    /**
     * saveNewPassword
     * @param password
     */
    public static async saveNewPassword(password: UserSavePassword): Promise<boolean> {
        const result = await NetFetch.postData('/json/user/savepassword', password);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                case StatusCodes.INTERNAL_ERROR:
                    throw new Error(result.msg);
            }
        }

        return false;
    }

    /**
     * saveNewPin
     * @param pin
     */
    public static async saveNewPin(pin: UserSavePin): Promise<boolean> {
        const result = await NetFetch.postData('/json/user/savepin', pin);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                case StatusCodes.INTERNAL_ERROR:
                    throw new Error(result.msg);
            }
        }

        return false;
    }
}