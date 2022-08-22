import * as bcrypt from 'bcrypt';
import {Group as GroupDB} from './Entity/Group';
import {User as UserDB} from './Entity/User';
import {MariaDbHelper} from './MariaDbHelper';

/**
 * DBSetup
 * init db for first start with a default:
 *  - user
 *  - group
 */
export class DBSetup {

    /**
     * firstInit
     */
    public static async firstInit(): Promise<void> {
        const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
        const userCount = await userRepository.count();

        if (userCount === 0) {
            const nGroup = new GroupDB();
            nGroup.role = 'admin';
            nGroup.description = 'Administrator group';
            nGroup.organization_id = 0;

            // save group to db
            const adminGroup = await MariaDbHelper.getConnection().manager.save(nGroup);

            const nUser = new UserDB();

            nUser.username = 'mwpaadmin';
            nUser.main_groupid = adminGroup.id;
            nUser.email = 'admin@mwpa.org';
            nUser.password = await bcrypt.hash('changeMyPassword', 10);
            nUser.disable = false;
            nUser.isAdmin = true;

            // save user to db
            await MariaDbHelper.getConnection().manager.save(nUser);

            console.log('Admin user create for first init.');
        }

    }

}