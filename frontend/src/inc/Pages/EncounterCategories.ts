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
    Tr2
} from 'bambooo';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {EncounterCategoriesEditModal} from './EncounterCategories/EncounterCategoriesEditModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'name' | 'status';
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
 * Encounter Categories admin page — drives the picker for a
 * sighting's "reaction" field.
 *
 * Modern Sighting/Vehicle-style: TableWrapper with infinite scroll,
 * single-column sort, in-header quick search across name + description.
 * Soft-deleted rows stay visible with a grey badge so admins can
 * revive them.
 */
export class EncounterCategories extends BasePage {

    protected override _name: string = 'admin-encounters';

    protected _dialog: EncounterCategoriesEditModal;

    public constructor() {
        super();

        this._dialog = new EncounterCategoriesEditModal();

        this._dialog.setOnSave(async(): Promise<void> => {
            const id = this._dialog.getEntryId();
            const name = this._dialog.getName();

            if (name === '') {
                this._toast.fire({icon: 'error', title: 'Name is required.'});
                return;
            }

            try {
                const entry: EncounterCategorieEntry = {
                    id: id ?? 0,
                    name,
                    description: this._dialog.getDescription(),
                    isdeleted: this._dialog.getIsDeleted()
                };

                if (await EncounterCategoriesAPI.save(entry)) {
                    this._dialog.hide();
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }
                    this._toast.fire({icon: 'success', title: 'Encounter saved.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add Encounter', 'fas fa-plus', () => {
            this._dialog.resetValues();
            this._dialog.setTitle(new LangTextV2({text: 'Add Encounter Category'}));
            this._dialog.show();
        });

        const lang = Lang.i();

        const row1 = new ContentRow2(this._wrapper.getContentWrapper().getContent().getContentFluidElement());
        const col = new ContentCol2(row1, ContentColSize2.col12);
        const card = new Card2({});
        card.appendTo(col.getElement());
        card.setTitle(new LangTextV2({text: 'Encounter Categories'}));

        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new Input2({type: InputType2.text});
        searchInput.appendTo(searchSlot);
        searchInput.setPlaceholder(`${lang.l('search name / description …')}`);

        const sort: SortState = {
            id: SortOrder2.NONE,
            name: SortOrder2.ASC,
            status: SortOrder2.NONE
        };

        let searchTerm = '';
        let allEntries: EncounterCategorieEntry[] = [];

        const tableWrapper = new TableWrapper2<EncounterCategorieEntry>({tableOptions: {head_fixed: true}});
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
        new Th2({value: new LangTextV2({text: 'Description'})}).appendTo(trhead);
        new Th2({value: makeSortColumn('Status', 'status')}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Action'})}).appendTo(trhead);

        const renderRow = (_table: Table2, entry: EncounterCategorieEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());
            const term = searchTerm;

            new Td2({value: `#${entry.id}`}).appendTo(trbody);

            const nameTd = new Td2({value: ''});
            nameTd.appendTo(trbody);
            nameTd.getElement().html(`<b>${highlight(entry.name, term)}</b>`);

            const descTd = new Td2({value: ''});
            descTd.appendTo(trbody);
            descTd.getElement().html(highlight(entry.description ?? '', term));

            const statusTd = new Td2({value: ''});
            statusTd.appendTo(trbody);
            if (entry.isdeleted) {
                new Badge2({text: lang.l('deleted') ?? 'deleted', type: BadgeType2.secondary}).appendTo(statusTd);
            } else {
                new Badge2({text: lang.l('active') ?? 'active', type: BadgeType2.success}).appendTo(statusTd);
            }

            const actionTd = new Td2({value: ''});
            actionTd.appendTo(trbody);
            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actionTd);

            btnMenu.addMenuItem('Edit', (): void => {
                this._dialog.resetValues();
                this._dialog.setTitle(new LangTextV2({text: 'Edit Encounter Category'}));
                this._dialog.setEntryId(entry.id);
                this._dialog.setName(entry.name);
                this._dialog.setDescription(entry.description ?? '');
                this._dialog.setIsDeleted(entry.isdeleted);
                this._dialog.show();
            }, IconFa.edit);

            btnMenu.addDivider();

            btnMenu.addMenuItem('Delete', (): void => {
                DialogConfirm2.confirm(
                    'dcDeleteEncounter',
                    ModalDialogType2.large,
                    'Delete Encounter Category',
                    'Soft-delete this encounter category?'
                    + ' Historical sightings that reference it keep the link;'
                    + ' it disappears from the picker for new sightings.'
                    + ' Revive it later from the Edit dialog.',
                    async(_, dialog) => {
                        try {
                            if (await EncounterCategoriesAPI.delete({id: entry.id})) {
                                this._toast.fire({icon: 'success', title: 'Encounter deleted.'});
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

        const statusRank = (e: EncounterCategorieEntry): number => e.isdeleted ? 1 : 0;

        const buildPage = (page: number): EncounterCategorieEntry[] => {
            const term = searchTerm.toLowerCase();

            const filtered = term === ''
                ? allEntries.slice()
                : allEntries.filter((e) => {
                    if (e.name.toLowerCase().includes(term)) {
                        return true;
                    }
                    return (e.description ?? '').toLowerCase().includes(term);
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
                        case 'status':
                            av = statusRank(a);
                            bv = statusRank(b);
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
                allEntries = await EncounterCategoriesAPI.getList();
                card.setTitle(`Encounter Categories (${allEntries.length})`);
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