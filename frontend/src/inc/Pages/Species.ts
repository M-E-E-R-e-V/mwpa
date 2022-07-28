import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {SpeciesEditModal} from './Species/SpeciesEditModal';

/**
 * Species
 */
export class Species extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'admin-species';

    /**
     * species dialog
     * @protected
     */
    protected _speciesDialog: SpeciesEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // species modal -----------------------------------------------------------------------------------------------

        this._speciesDialog = new SpeciesEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Species', () => {
            this._speciesDialog.setTitle('Add Species');
            this._speciesDialog.show();
            return false;
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {

    }

}