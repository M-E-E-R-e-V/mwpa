import {
    Badge,
    BadgeType,
    ButtonClass,
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    DialogConfirm,
    IconFa,
    LangText,
    LeftNavbarLink,
    ModalDialogType,
    Table,
    Td,
    Th,
    Tr,
    UtilColor
} from 'bambooo';
import {Species as SpeciesAPI, SpeciesEntry, SpeciesMerge} from '../Api/Species';
import {SpeciesGroup as SpeciesGroupAPI} from '../Api/SpeciesGroup';
import {Lang} from '../Lang';
import {UtilOttLink} from '../Utils/UtilOttLink';
import {SpeciesGroupDisplay} from '../Widget/SpeciesGroupDisplay';
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
    protected override _name: string = 'admin-species';

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
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Specie', async() => {
            this._speciesDialog.resetValues();
            this._speciesDialog.setTitle('Add Specie');

            const groups = await SpeciesGroupAPI.getList();

            if (groups) {
                this._speciesDialog.setSpeciesGroupList(groups);
            }

            this._speciesDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // species dialog save -----------------------------------------------------------------------------------------

        this._speciesDialog.setOnSave(async(): Promise<void> => {
            let tid = this._speciesDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const aspecie: SpeciesEntry = {
                    id: tid,
                    ottid: this._speciesDialog.getOttId(),
                    name: this._speciesDialog.getName(),
                    species_groupid: this._speciesDialog.getSpeciesGroup()
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
    public override async loadContent(): Promise<void> {
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
            new Th(trhead, new LangText('Ott-Id'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Species-Name'));

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            if (species) {
                for (const specie of species) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${specie.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${specie.name}`);

                    // eslint-disable-next-line no-new
                    const ottIdTd = new Td(trbody, '');

                    if (specie.ottid !== 0) {
                        const ottBadge = new Badge(
                            ottIdTd,
                            `<b style="color: ${UtilColor.getContrastYIQ('#6c757d')}">${specie.ottid}</b>`,
                            BadgeType.info,
                            '#6c757d'
                        );

                        UtilOttLink.setDialog(ottBadge.getElement(), `ID: ${specie.ottid}`, specie.ottid);
                    }

                    // eslint-disable-next-line no-new
                    const speciesGroupTd = new Td(trbody, '');


                    //     eslint-disable-next-line no-new
                    new SpeciesGroupDisplay(speciesGroupTd, specie.species_group ?? {
                        name: 'Unknown',
                        color: 'white'
                    });

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
                        async(): Promise<void> => {
                            this._speciesDialog.resetValues();
                            this._speciesDialog.setTitle('Edit Species');
                            this._speciesDialog.setId(specie.id);
                            this._speciesDialog.setName(specie.name);
                            this._speciesDialog.setOttId(specie.ottid);

                            const groups = await SpeciesGroupAPI.getList();

                            if (groups) {
                                this._speciesDialog.setSpeciesGroupList(groups);
                            }

                            this._speciesDialog.setSpeciesGroup(specie.species_groupid);

                            this._speciesDialog.show();
                        },
                        IconFa.edit
                    );

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
                        IconFa.ban
                    );

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            DialogConfirm.confirm(
                                'dcDeleteSpecie',
                                ModalDialogType.large,
                                'Delete Specie',
                                'Are you sure you want to delete the specie?',
                                async(
                                    _,
                                    dialog
                                ) => {
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
                        IconFa.trash
                    );
                }
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}