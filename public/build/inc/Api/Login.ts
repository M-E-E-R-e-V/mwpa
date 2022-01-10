import {NetFetch} from '../Net/NetFetch';

/**
 * Login
 */
export class Login {

    /**
     * login
     * @param _email
     * @param _password
     */
    public static async login(_email: string, _password: string): Promise<boolean> {
        const response = await NetFetch.postData('/json/login', {
            email: _email,
            password: _password
        });

        if (response) {
            if (response.success) {
                return true;
            }

            throw new Error(response.error);
        }

        return false;
    }

    /**
     * logout
     */
    public static async logout(): Promise<boolean> {
        const response = await NetFetch.getData('/json/logout');

        if (response) {
            return true;
        }

        return false;
    }

}