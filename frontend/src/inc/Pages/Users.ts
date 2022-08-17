import {User as UserAPI} from '../Api/User';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

/**
 * Users
 */
export class Users extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'admin-users';

    /**
     * constructor
     */
    public constructor() {
        super();

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', () => {
            return false;
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        this._onLoadTable = async(): Promise<void> => {
            const users = await UserAPI.getUserInfo();

            if (users) {
                for (const user of users) {

                }
            }

            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}