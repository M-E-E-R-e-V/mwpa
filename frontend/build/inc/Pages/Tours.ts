import {LeftNavbarLink} from '../PageComponents/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {TourEditModal} from './Tours/TourEditModal';

/**
 * Tours
 */
export class Tours extends BasePage {

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
            this._wrapper.getContentWrapper().getContent()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add tour', () => {
            this._tourDialog.setTitle('Add new tour');
            this._tourDialog.show();
            return false;
        });
    }

}