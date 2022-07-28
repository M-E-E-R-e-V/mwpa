import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Table} from '../Bambooo/Content/Table/Table';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {TourEditModal} from './Tours/TourEditModal';

/**
 * Tours
 */
export class Tours extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'tours';

    /**
     * tour dialog
     * @protected
     */
    protected _tourDialog: TourEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // tour modal --------------------------------------------------------------------------------------------------

        this._tourDialog = new TourEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add tour', () => {
            this._tourDialog.setTitle('Add new tour');
            this._tourDialog.show();
            return false;
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Tours');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Date');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Vehicle<br>Driver');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Count Sighting');

        // eslint-disable-next-line no-new
        new Th(trhead, '');


    }

}