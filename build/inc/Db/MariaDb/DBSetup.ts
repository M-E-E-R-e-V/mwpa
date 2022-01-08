import * as bcrypt from 'bcrypt';
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
            const newUser = new UserDB();

            newUser.username = 'nwpaadmin';
            newUser.email = 'admin@nwpa.org';
            newUser.password = await bcrypt.hash('changeMyPassword', 10);
            newUser.disable = false;
            newUser.isAdmin = true;

            await MariaDbHelper.getConnection().manager.save(newUser);

            console.log('Admin user create for first init.');
        }

    }

}