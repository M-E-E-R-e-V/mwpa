import {
    UserData,
    UserInfo,
    UserInfoData,
    UserInfoGroup,
    UserInfoOrg,
    UserListFilter,
    UserListResponse,
    UserSavePasswordRequest,
    UserSavePinRequest
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

/*
 * Schema-typed re-exports. Legacy hand-written aliases stay so the
 * existing call sites (UsersEditModal etc.) compile unchanged after
 * the port.
 */
export type {
    UserData,
    UserInfo,
    UserInfoData,
    UserInfoGroup,
    UserInfoOrg,
    UserListFilter,
    UserListResponse,
    UserSavePasswordRequest,
    UserSavePinRequest
};

export type UserSavePassword = UserSavePasswordRequest;
export type UserSavePin = UserSavePinRequest;

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
    public static async saveNewPassword(password: UserSavePasswordRequest): Promise<boolean> {
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
    public static async saveNewPin(pin: UserSavePinRequest): Promise<boolean> {
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