import {BasePage} from './BasePage';

/**
 * Admin
 */
export class Admin extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'admin';

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {

    }

}
