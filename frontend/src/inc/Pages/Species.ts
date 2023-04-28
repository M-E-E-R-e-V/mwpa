import {Species as SpeciesAPI, SpeciesEntry, SpeciesMerge} from '../Api/Species';
import {ButtonClass} from '../Bambooo/Content/Button/ButtonDefault';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {DialogConfirm} from '../Bambooo/Content/Dialog/DialogConfirm';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LangText} from '../Bambooo/Lang/LangText';
import {ModalDialogType} from '../Bambooo/Modal/ModalDialog';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {SpeciesEditModal} from './Species/SpeciesEditModal';
import {SpeciesMergeModal} from './Species/SpeciesMergeModal';

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
     * merge dialog
     * @protected
     */
    protected _mergeDialog: SpeciesMergeModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // dialogs modal -----------------------------------------------------------------------------------------------

        this._speciesDialog = new SpeciesEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        this._mergeDialog = new SpeciesMergeModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Specie', () => {
            this._speciesDialog.resetValues();
            this._speciesDialog.setTitle('Add Specie');
            this._speciesDialog.show();
            return false;
        });

        // species dialog save -----------------------------------------------------------------------------------------

        this._speciesDialog.setOnSave(async(): Promise<void> => {
            let tid = this._speciesDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const aspecie: SpeciesEntry = {
                    id: tid,
                    name: this._speciesDialog.getName()
                };

                if (await SpeciesAPI.save(aspecie)) {
                    this._speciesDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Specie save success.'
                    });
                }
            } catch (message) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });

        // merge dialog save -------------------------------------------------------------------------------------------

        this._mergeDialog.setOnSave(async(): Promise<void> => {
            try {
                const merge: SpeciesMerge = {
                    source_id: parseInt(this._mergeDialog.getSourceSpecie(), 10),
                    destination_id: parseInt(this._mergeDialog.getDestinationSpecie(), 10)
                };

                if (await SpeciesAPI.merge(merge)) {
                    this._mergeDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Specie merge success.'
                    });
                }
            } catch (message) {
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
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol(row1, ContentColSize.col12));

            card.setTitle(new LangText('Species'));
            card.showLoading();

            const species = await SpeciesAPI.getList();

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Id'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Name'));

            // eslint-disable-next-line no-new
            new Th(trhead, '');

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
                        async(): Promise<void> => {
                            this._mergeDialog.resetValues();
                            this._mergeDialog.setTitle('Merge Species');

                            const tspecies = await SpeciesAPI.getList();

                            if (tspecies) {
                                this._mergeDialog.setSpecies(tspecies);
                            }

                            this._mergeDialog.setSourceSpecie(`${specie.id}`);
                            this._mergeDialog.show();
                        },
                        IconFa.ban);

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            DialogConfirm.confirm(
                                'dcDeleteSpecie',
                                ModalDialogType.large,
                                'Delete Specie',
                                `Are you sure you want to delete the specie?`,
                                async(_, dialog) => {
                                    try {
                                        if (await SpeciesAPI.delete({id: specie.id})) {
                                            this._toast.fire({
                                                icon: 'success',
                                                title: 'Specie delete success.'
                                            });
                                        }
                                    } catch (message) {
                                        this._toast.fire({
                                            icon: 'error',
                                            title: message
                                        });
                                    }

                                    dialog.hide();

                                    if (this._onLoadTable) {
                                        this._onLoadTable();
                                    }
                                },
                                undefined,
                                'Delete',
                                ButtonClass.danger
                            );
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