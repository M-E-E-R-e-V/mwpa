import {
    Badge2,
    BadgeType2,
    ButtonClass2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    DialogConfirm2,
    IconFa,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialogType2,
    SortingColumn2,
    SortOrder2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tr2,
    UtilColor
} from 'bambooo';
import {Species as SpeciesAPI, SpeciesEntry, SpeciesMerge} from '../Api/Species';
import {SpeciesGroup as SpeciesGroupAPI} from '../Api/SpeciesGroup';
import {Lang} from '../Lang';
import {PageLoader} from '../PageLoader';
import {UtilOttLink} from '../Utils/UtilOttLink';
import {UtilWormsLink} from '../Utils/UtilWormsLink';
import {SpeciesGroupDisplay} from '../Widget/SpeciesGroupDisplay';
import {BasePage} from './BasePage';
import {SpeciesProfile as SpeciesProfilePage} from './Species/Profile';
import {SpeciesEditModal} from './Species/SpeciesEditModal';
import {SpeciesMergeModal} from './Species/SpeciesMergeModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'name' | 'ottid' | 'aphiaid' | 'group';
type SortState = Record<SortKey, SortOrder2>;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

const highlight = (text: string, term: string): string => {
    if (text === '') {
        return '';
    }
    const escaped = escapeHtml(text);
    if (term === '') {
        return escaped;
    }
    const safe = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
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

        this._speciesDialog = new SpeciesEditModal();

        this._mergeDialog = new SpeciesMergeModal();

        this._speciesDialog.setOnSave(async(): Promise<void> => {
            let tid = this._speciesDialog.getSpecieId();
            if (tid === null) {
                tid = 0;
            }

            try {
                const aspecie: SpeciesEntry = {
                    id: tid,
                    ottid: this._speciesDialog.getOttId(),
                    aphiaid: this._speciesDialog.getAphiaId(),
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
                    this._toast.fire({icon: 'success', title: Lang.i().l('Specie merge success.')});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add Specie', 'fas fa-plus', async() => {
            this._speciesDialog.resetValues();
            this._speciesDialog.setTitle(new LangTextV2({text: 'Add Specie'}));

            const groups = await SpeciesGroupAPI.getList();
            if (groups) {
                this._speciesDialog.setSpeciesGroupList(groups);
            }

            this._speciesDialog.show();
        });

        const lang = Lang.i();

        const row1 = new ContentRow2(this._wrapper.getContentWrapper().getContent().getContentFluidElement());
        const col = new ContentCol2(row1, ContentColSize2.col12);
        const card = new Card2({});
        card.appendTo(col.getElement());
        card.setTitle(new LangTextV2({text: 'Species'}));

        // In-header quick search.
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new Input2({type: InputType2.text});
        searchInput.appendTo(searchSlot);
        searchInput.setPlaceholder(`${lang.l('search name / group / ott-id / WoRMS …')}`);

        const sort: SortState = {
            id: SortOrder2.NONE,
            name: SortOrder2.ASC,
            ottid: SortOrder2.NONE,
            aphiaid: SortOrder2.NONE,
            group: SortOrder2.NONE
        };

        let searchTerm = '';
        let allSpecies: SpeciesEntry[] = [];

        const tableWrapper = new TableWrapper2<SpeciesEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        const sortRegistry: {key: SortKey; column: LangTextV2;}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangTextV2 => {
            const column = new LangTextV2({
                text: label,
                onClick: (element): void => {
                    const newValue = SortingColumn2.changeSort(element, sort[key]);

                    for (const other of sortRegistry) {
                        if (other.key !== key) {
                            sort[other.key] = SortOrder2.NONE;
                            SortingColumn2.initSort(other.column, SortOrder2.NONE);
                        }
                    }

                    sort[key] = newValue as SortOrder2;
                    tableWrapper.reset();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        new Th2({value: makeSortColumn('Id', 'id')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Name', 'name')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Ott-Id', 'ottid')}).appendTo(trhead);
        new Th2({value: makeSortColumn('WoRMS', 'aphiaid')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Species Group', 'group')}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Action'})}).appendTo(trhead);

        const renderRow = (_table: Table2, specie: SpeciesEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());
            const term = searchTerm;

            new Td2({value: `#${specie.id}`}).appendTo(trbody);

            const nameTd = new Td2({value: ''});
            nameTd.appendTo(trbody);
            nameTd.getElement().html(`<b>${highlight(specie.name, term)}</b>`);

            const ottIdTd = new Td2({value: ''});
            ottIdTd.appendTo(trbody);
            if (specie.ottid !== 0) {
                const ottBadge = new Badge2({type: BadgeType2.info, color: '#6c757d'});
                ottBadge.appendTo(ottIdTd);
                ottBadge.getElement().html(`<b style="color: ${UtilColor.getContrastYIQ('#6c757d')}">${specie.ottid}</b>`);
                UtilOttLink.setDialog(ottBadge.getElement(), `ID: ${specie.ottid}`, specie.ottid);
            }

            const aphiaIdTd = new Td2({value: ''});
            aphiaIdTd.appendTo(trbody);
            const aphiaValue = specie.aphiaid ?? 0;
            if (aphiaValue !== 0) {
                const aphiaBadge = new Badge2({type: BadgeType2.info, color: '#1b6ec2'});
                aphiaBadge.appendTo(aphiaIdTd);
                aphiaBadge.getElement().html(`<b style="color: ${UtilColor.getContrastYIQ('#1b6ec2')}">${aphiaValue}</b>`);
                UtilWormsLink.setDialog(aphiaBadge.getElement(), specie.name, aphiaValue);
            }

            const speciesGroupTd = new Td2({value: ''});
            speciesGroupTd.appendTo(trbody);
            // eslint-disable-next-line no-new
            new SpeciesGroupDisplay(speciesGroupTd.getElement(), specie.species_group ?? {
                name: 'Unknown',
                color: 'white'
            });

            const actionTd = new Td2({value: ''});
            actionTd.appendTo(trbody);
            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actionTd);

            btnMenu.addMenuItem(lang.l('Profile'), (): void => {
                PageLoader.getInstance().load(new SpeciesProfilePage(specie.id)).then();
            }, 'fas fa-chart-bar');

            btnMenu.addMenuItem('Edit', async(): Promise<void> => {
                this._speciesDialog.resetValues();
                this._speciesDialog.setTitle(new LangTextV2({text: 'Edit Species'}));
                this._speciesDialog.setSpecieId(specie.id);
                this._speciesDialog.setName(specie.name);
                this._speciesDialog.setOttId(specie.ottid);
                this._speciesDialog.setAphiaId(specie.aphiaid ?? 0);

                const groups = await SpeciesGroupAPI.getList();
                if (groups) {
                    this._speciesDialog.setSpeciesGroupList(groups);
                }

                this._speciesDialog.setSpeciesGroup(specie.species_groupid);
                this._speciesDialog.show();
            }, IconFa.edit);

            btnMenu.addMenuItem('Merge', async(): Promise<void> => {
                this._mergeDialog.resetValues();
                this._mergeDialog.setTitle(new LangTextV2({text: 'Merge Species'}));

                const tspecies = await SpeciesAPI.getList();
                if (tspecies) {
                    this._mergeDialog.setSpecies(tspecies);
                }

                this._mergeDialog.setSourceSpecie(`${specie.id}`);
                this._mergeDialog.show();
            }, IconFa.ban);

            btnMenu.addDivider();

            btnMenu.addMenuItem('Delete', (): void => {
                DialogConfirm2.confirm(
                    'dcDeleteSpecie',
                    ModalDialogType2.large,
                    'Delete Specie',
                    'Are you sure you want to delete the specie?',
                    async(_, dialog) => {
                        try {
                            if (await SpeciesAPI.delete({id: specie.id})) {
                                this._toast.fire({icon: 'success', title: Lang.i().l('Specie delete success.')});
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
                    ButtonClass2.danger
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
                    if (`${s.ottid}`.includes(term)) {
                        return true;
                    }
                    return `${s.aphiaid ?? 0}`.includes(term);
                });

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const order = sort[activeKey];
                const dir = order === SortOrder2.DESC ? -1 : 1;
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
                        case 'aphiaid':
                            av = a.aphiaid ?? 0;
                            bv = b.aphiaid ?? 0;
                            break;
                        case 'group':
                            av = (a.species_group?.name ?? '').toLowerCase();
                            bv = (b.species_group?.name ?? '').toLowerCase();
                            break;
                    }

                    if (av < bv) {return -1 * dir;}
                    if (av > bv) {return Number(dir);}
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
                card.setTitle(`${Lang.i().l('Species')} (${allSpecies.length})`);
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