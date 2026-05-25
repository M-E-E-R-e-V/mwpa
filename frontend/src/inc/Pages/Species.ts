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
    InputBottemBorderOnly2,
    InputType,
    LangText,
    LeftNavbarLink,
    ModalDialogType,
    SortingColumn,
    SortOrder,
    Table,
    TableWrapper,
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
import {CrossSpeciesAnalytics as CrossSpeciesAnalyticsPage} from './Species/CrossSpeciesAnalytics';
import {SpeciesProfile as SpeciesProfilePage} from './Species/Profile';
import {SpeciesEditModal} from './Species/SpeciesEditModal';
import {SpeciesMergeModal} from './Species/SpeciesMergeModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'name' | 'ottid' | 'group';
type SortState = Record<SortKey, SortOrder>;

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlight = (text: string, term: string): string => {
    if (text === '') {
        return '';
    }
    const escaped = escapeHtml(text);
    if (term === '') {
        return escaped;
    }
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(safe, 'giu'), (match) => `<mark>${match}</mark>`);
};

/**
 * Species admin page — modern Sighting/Vehicle-style:
 * TableWrapper with infinite scroll, single-column sort, in-header
 * quick search across name + species_group + ottid. Backend still
 * returns the whole species list at once (small table), so filter +
 * sort happen client-side.
 */
export class Species extends BasePage {

    public static NAME: string = 'admin-species';

    protected override _name: string = Species.NAME;

    protected _speciesDialog: SpeciesEditModal;

    protected _mergeDialog: SpeciesMergeModal;

    public constructor() {
        super();

        this._speciesDialog = new SpeciesEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        this._mergeDialog = new SpeciesMergeModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Cross-species analytics', async() => {
            if (this._loadPageFn) {
                this._loadPageFn(new CrossSpeciesAnalyticsPage());
            }
            return false;
        }, 'btn btn-block btn-default btn-sm', 'fa-solid fa-chart-line');

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Specie', async() => {
            this._speciesDialog.resetValues();
            this._speciesDialog.setTitle(new LangText('Add Specie'));

            const groups = await SpeciesGroupAPI.getList();
            if (groups) {
                this._speciesDialog.setSpeciesGroupList(groups);
            }

            this._speciesDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

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
                    this._toast.fire({icon: 'success', title: 'Specie save success.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

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
                    this._toast.fire({icon: 'success', title: 'Specie merge success.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Species'));

        // In-header quick search.
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new InputBottemBorderOnly2(searchSlot, undefined, InputType.text);
        searchInput.setPlaceholder(`${lang.l('search name / group / ott-id …')}`);

        const sort: SortState = {
            id: SortOrder.NONE,
            name: SortOrder.ASC,
            ottid: SortOrder.NONE,
            group: SortOrder.NONE
        };

        let searchTerm = '';
        let allSpecies: SpeciesEntry[] = [];

        const tableWrapper = new TableWrapper<SpeciesEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        const sortRegistry: {key: SortKey; column: LangText}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangText => {
            const column = new LangText(label, undefined, (element) => {
                const newValue = SortingColumn.changeSort(element, sort[key]);

                for (const other of sortRegistry) {
                    if (other.key !== key) {
                        sort[other.key] = SortOrder.NONE;
                        SortingColumn.initSort(other.column, SortOrder.NONE);
                    }
                }

                sort[key] = newValue as SortOrder;
                tableWrapper.reset();
            });

            SortingColumn.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Id', 'id'));
        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Name', 'name'));
        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Ott-Id', 'ottid'));
        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Species Group', 'group'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, specie: SpeciesEntry): void => {
            const trbody = new Tr(table.getTbody());
            const term = searchTerm;

            // eslint-disable-next-line no-new
            new Td(trbody, `#${specie.id}`);

            const nameTd = new Td(trbody, '');
            nameTd.getElement().html(`<b>${highlight(specie.name, term)}</b>`);

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

            const speciesGroupTd = new Td(trbody, '');
            // eslint-disable-next-line no-new
            new SpeciesGroupDisplay(speciesGroupTd, specie.species_group ?? {
                name: 'Unknown',
                color: 'white'
            });

            const actionTd = new Td(trbody, '');
            const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

            btnMenu.addMenuItem(lang.l('Profile'), (): void => {
                if (this._loadPageFn) {
                    this._loadPageFn(new SpeciesProfilePage(specie.id));
                }
            }, 'fa-solid fa-chart-column');

            btnMenu.addMenuItem('Edit', async(): Promise<void> => {
                this._speciesDialog.resetValues();
                this._speciesDialog.setTitle(new LangText('Edit Species'));
                this._speciesDialog.setId(specie.id);
                this._speciesDialog.setName(specie.name);
                this._speciesDialog.setOttId(specie.ottid);

                const groups = await SpeciesGroupAPI.getList();
                if (groups) {
                    this._speciesDialog.setSpeciesGroupList(groups);
                }

                this._speciesDialog.setSpeciesGroup(specie.species_groupid);
                this._speciesDialog.show();
            }, IconFa.edit);

            btnMenu.addMenuItem('Merge', async(): Promise<void> => {
                this._mergeDialog.resetValues();
                this._mergeDialog.setTitle(new LangText('Merge Species'));

                const tspecies = await SpeciesAPI.getList();
                if (tspecies) {
                    this._mergeDialog.setSpecies(tspecies);
                }

                this._mergeDialog.setSourceSpecie(`${specie.id}`);
                this._mergeDialog.show();
            }, IconFa.ban);

            btnMenu.addDivider();

            btnMenu.addMenuItem('Delete', (): void => {
                DialogConfirm.confirm(
                    'dcDeleteSpecie',
                    ModalDialogType.large,
                    'Delete Specie',
                    'Are you sure you want to delete the specie?',
                    async(_, dialog) => {
                        try {
                            if (await SpeciesAPI.delete({id: specie.id})) {
                                this._toast.fire({icon: 'success', title: 'Specie delete success.'});
                            }
                        } catch (message) {
                            this._toast.fire({icon: 'error', title: message});
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
            }, IconFa.trash);

            Lang.i().lAll();
        };

        // Filter + sort the in-memory list, then feed pages to TableWrapper.
        const buildPage = (page: number): SpeciesEntry[] => {
            const term = searchTerm.toLowerCase();

            const filtered = term === ''
                ? allSpecies.slice()
                : allSpecies.filter((s) => {
                    if (s.name.toLowerCase().includes(term)) {
                        return true;
                    }
                    const groupName = (s.species_group?.name ?? '').toLowerCase();
                    if (groupName.includes(term)) {
                        return true;
                    }
                    return `${s.ottid}`.includes(term);
                });

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder.NONE);

            if (activeKey) {
                const order = sort[activeKey];
                const dir = order === SortOrder.DESC ? -1 : 1;
                filtered.sort((a, b) => {
                    let av: string | number;
                    let bv: string | number;

                    switch (activeKey) {
                        case 'id':
                            av = a.id;
                            bv = b.id;
                            break;
                        case 'name':
                            av = a.name.toLowerCase();
                            bv = b.name.toLowerCase();
                            break;
                        case 'ottid':
                            av = a.ottid;
                            bv = b.ottid;
                            break;
                        case 'group':
                            av = (a.species_group?.name ?? '').toLowerCase();
                            bv = (b.species_group?.name ?? '').toLowerCase();
                            break;
                    }

                    if (av < bv) return -1 * dir;
                    if (av > bv) return 1 * dir;
                    return 0;
                });
            }

            const offset = page * PAGE_SIZE;
            return filtered.slice(offset, offset + PAGE_SIZE);
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            try {
                const species = await SpeciesAPI.getList();
                allSpecies = species ?? [];
                card.setTitle(`Species (${allSpecies.length})`);
                await tableWrapper.reset();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => buildPage(page),
            renderRow,
            false
        );

        let searchTimer: ReturnType<typeof setTimeout> | null = null;
        searchInput.getElement().on('keyup', () => {
            if (searchTimer !== null) {
                clearTimeout(searchTimer);
            }

            searchTimer = setTimeout(() => {
                const value = searchInput.getValue().trim();
                if (value === searchTerm) {
                    return;
                }
                searchTerm = value;
                tableWrapper.reset();
            }, 300);
        });

        this._onLoadTable();
    }

}