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
    Tr
} from 'bambooo';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {EncounterCategoriesEditModal} from './EncounterCategories/EncounterCategoriesEditModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'name' | 'status';
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

        this._dialog = new EncounterCategoriesEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Encounter', () => {
            this._dialog.resetValues();
            this._dialog.setTitle(new LangText('Add Encounter Category'));
            this._dialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._dialog.setOnSave(async(): Promise<void> => {
            const id = this._dialog.getId();
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
        const lang = Lang.i();

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Encounter Categories'));

        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new InputBottemBorderOnly2(searchSlot, undefined, InputType.text);
        searchInput.setPlaceholder(`${lang.l('search name / description …')}`);

        const sort: SortState = {
            id: SortOrder.NONE,
            name: SortOrder.ASC,
            status: SortOrder.NONE
        };

        let searchTerm = '';
        let allEntries: EncounterCategorieEntry[] = [];

        const tableWrapper = new TableWrapper<EncounterCategorieEntry>(card.getElement(), {head_fixed: true});
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
        new Th(trhead, new LangText('Description'));
        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Status', 'status'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, entry: EncounterCategorieEntry): void => {
            const trbody = new Tr(table.getTbody());
            const term = searchTerm;

            // eslint-disable-next-line no-new
            new Td(trbody, `#${entry.id}`);

            const nameTd = new Td(trbody, '');
            nameTd.getElement().html(`<b>${highlight(entry.name, term)}</b>`);

            const descTd = new Td(trbody, '');
            descTd.getElement().html(highlight(entry.description ?? '', term));

            const statusTd = new Td(trbody, '');
            if (entry.isdeleted) {
                // eslint-disable-next-line no-new
                new Badge(statusTd, lang.l('deleted') ?? 'deleted', BadgeType.secondary);
            } else {
                // eslint-disable-next-line no-new
                new Badge(statusTd, lang.l('active') ?? 'active', BadgeType.success);
            }

            const actionTd = new Td(trbody, '');
            const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

            btnMenu.addMenuItem('Edit', (): void => {
                this._dialog.resetValues();
                this._dialog.setTitle(new LangText('Edit Encounter Category'));
                this._dialog.setId(entry.id);
                this._dialog.setName(entry.name);
                this._dialog.setDescription(entry.description ?? '');
                this._dialog.setIsDeleted(entry.isdeleted);
                this._dialog.show();
            }, IconFa.edit);

            btnMenu.addDivider();

            btnMenu.addMenuItem('Delete', (): void => {
                DialogConfirm.confirm(
                    'dcDeleteEncounter',
                    ModalDialogType.large,
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
                    ButtonClass.danger
                );
            }, IconFa.trash);

            Lang.i().lAll();
        };

        const statusRank = (e: EncounterCategorieEntry): number => (e.isdeleted ? 1 : 0);

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
                        case 'status':
                            av = statusRank(a);
                            bv = statusRank(b);
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