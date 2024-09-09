import {IconFa, LeftNavbarLink} from 'bambooo';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

export class Vehicle extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'admin-vehicle';

    /**
     * constructor
     */
    public constructor() {
        super();

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Vehicle', async() => {
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();


            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}