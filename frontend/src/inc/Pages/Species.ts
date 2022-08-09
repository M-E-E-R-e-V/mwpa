import {Species as SpeciesAPI} from '../Api/Species';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LangText} from '../Bambooo/Lang/LangText';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Lang} from '../Lang';
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

        this._speciesDialog.setOnSave(async(): Promise<void> => {
            let tid = this._speciesDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {

            } catch ({message}) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle(new LangText('Species'));

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Id'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Name'));

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();

            // @ts-ignore
            const species = await SpeciesAPI.getList();

            if (species) {
                for (const specie of species) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${specie.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${specie.name}`);

                    // action
                    const actionTd = new Td(trbody, '');

                    const btnMenu = new ButtonMenu(
                        actionTd,
                        IconFa.bars,
                        true,
                        ButtonType.borderless
                    );

                    btnMenu.addMenuItem(
                        'Edit',
                        (): void => {
                            this._speciesDialog.resetValues();
                            this._speciesDialog.setTitle('Edit Species');
                            this._speciesDialog.setId(specie.id);
                            this._speciesDialog.setName(specie.name);
                            this._speciesDialog.show();
                        },
                        IconFa.edit);

                    btnMenu.addMenuItem(
                        'Merge',
                        (): void => {

                        },
                        IconFa.merge);

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {

                        },
                        IconFa.trash);
                }
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}