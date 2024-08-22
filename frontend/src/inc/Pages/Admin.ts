import {BasePage} from './BasePage';

/**
 * Admin
 */
export class Admin extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'admin';

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {

    }

}