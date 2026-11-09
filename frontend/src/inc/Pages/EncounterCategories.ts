import {
    ButtonClass2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    DialogConfirm2,
    IconFa,
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
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';
import {EncounterCategoriesEditModal} from './EncounterCategories/EncounterCategoriesEditModal';

/**
 * Sortable columns
 */
type SortKey = 'id' | 'name' | 'status';

/**
 * Sort state per column
 */
type SortState = Record<SortKey, SortOrder2>;

/**
 * Toolbar filter state
 */
type EncounterFilter = {
    term: string;
    showDeleted: boolean;
};

/**
 * Encounter Categories admin page — drives the picker for a sighting's
 * "reaction" field. Same look as the species / vehicle lists (see
 * {@link AdminListUi}): search over name + description, "show deleted"
 * (old typo variants are soft-deleted), summary figures, name (click to
 * edit) with the description as guideline text, status pill, quick restore
 * for deleted rows.
 */
export class EncounterCategories extends BasePage {

    /**
     * Rows per TableWrapper page
     * @protected
     */
    protected static readonly _PAGE_SIZE = 30;

    protected override _name: string = 'admin-encounters';

    protected _dialog: EncounterCategoriesEditModal;

    public constructor() {
        super();

        this._dialog = new EncounterCategoriesEditModal();

        this._dialog.setOnSave(async(): Promise<void> => {
            const name = this._dialog.getName();

            if (name === '') {
                this._toast.fire({icon: 'error', title: Lang.i().l('Name is required.')});
                return;
            }

            await this._save({
                id: this._dialog.getEntryId() ?? 0,
                name,
                description: this._dialog.getDescription(),
                isdeleted: this._dialog.getIsDeleted()
            }, true);
        });
    }

    /**
     * Save an entry and refresh the list.
     * @param {EncounterCategorieEntry} entry
     * @param {boolean} fromDialog hide the dialog on success
     * @protected
     */
    protected async _save(entry: EncounterCategorieEntry, fromDialog: boolean): Promise<void> {
        try {
            if (await EncounterCategoriesAPI.save(entry)) {
                if (fromDialog) {
                    this._dialog.hide();
                }

                if (this._onLoadTable) {
                    this._onLoadTable();
                }

                this._toast.fire({icon: 'success', title: Lang.i().l('Encounter saved.')});
            }
        } catch (message) {
            this._toast.fire({icon: 'error', title: message});
        }
    }

    /**
     * Open the edit dialog.
     * @param {EncounterCategorieEntry} entry
     * @protected
     */
    protected _openEdit(entry: EncounterCategorieEntry): void {
        this._dialog.resetValues();
        this._dialog.setTitle(new LangTextV2({text: 'Edit Encounter Category'}));
        this._dialog.setEntryId(entry.id);
        this._dialog.setName(entry.name);
        this._dialog.setDescription(entry.description ?? '');
        this._dialog.setIsDeleted(entry.isdeleted);
        this._dialog.show();
    }

    /**
     * Ask and soft-delete an entry.
     * @param {EncounterCategorieEntry} entry
     * @protected
     */
    protected _confirmDelete(entry: EncounterCategorieEntry): void {
        const lang = Lang.i();

        DialogConfirm2.confirm(
            'dcDeleteEncounter',
            ModalDialogType2.large,
            lang.l('Delete Encounter Category'),
            `${lang.l('Soft-delete this encounter category?')} ${lang.l('Historical sightings that reference it keep the link; it disappears from the picker for new sightings. Revive it later from the Edit dialog.')}`,
            async(_, dialog) => {
                try {
                    if (await EncounterCategoriesAPI.delete({id: entry.id})) {
                        this._toast.fire({icon: 'success', title: lang.l('Encounter deleted.')});
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

        const filter: EncounterFilter = {
            term: '',
            showDeleted: false
        };

        let allEntries: EncounterCategorieEntry[] = [];
        let filteredEntries: EncounterCategorieEntry[] = [];

        // assigned below, used by the toolbar + sort handlers
        let applyFilter: (() => void) | null = null;

        // toolbar -----------------------------------------------------------------------------------------------------

        const toolbar = AdminListUi.toolbar(card.getElement());

        AdminListUi.search(toolbar, 'Search name or description …', (term): void => {
            filter.term = term;
            applyFilter?.();
        });

        AdminListUi.switch(toolbar, 'mwpa-encounter-show-deleted', 'Show deleted', (checked): void => {
            filter.showDeleted = checked;
            applyFilter?.();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);
        const stats = AdminListUi.statsRow(card.getElement());

        // table -------------------------------------------------------------------------------------------------------

        const sort: SortState = {
            id: SortOrder2.NONE,
            name: SortOrder2.ASC,
            status: SortOrder2.NONE
        };

        const tableWrapper = new TableWrapper2<EncounterCategorieEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No encounter categories match the current filter.');
        const table = tableWrapper.getTable();
        table.getElement().addClass('table-hover align-middle mb-0');
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
                    applyFilter?.();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        const thName = new Th2({value: makeSortColumn('Name', 'name')});
        thName.appendTo(trhead);
        thName.getElement().css('width', '22%');
        new Th2({value: new LangTextV2({text: 'Description'})}).appendTo(trhead);
        new Th2({value: makeSortColumn('Status', 'status')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Id', 'id')}).appendTo(trhead);
        const thAction = new Th2({value: ''});
        thAction.appendTo(trhead);
        thAction.getElement().css('width', '96px');

        const renderRow = (_table: Table2, entry: EncounterCategorieEntry): void => {
            const term = filter.term;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            if (entry.isdeleted) {
                tr.getElement().addClass('opacity-50');
            }

            // name (click → edit)
            const tdName = new Td2({value: ''});
            tdName.appendTo(tr);
            AdminListUi.nameLink(tdName.getElement(), AdminListUi.highlight(entry.name, term), (): void => {
                this._openEdit(entry);
            });

            // description (guideline text)
            const tdDescription = new Td2({value: ''});
            tdDescription.appendTo(tr);
            const description = (entry.description ?? '').trim();

            if (description === '') {
                jQuery('<span class="small text-body-tertiary fst-italic"/>').text(lang.l('No description')).appendTo(tdDescription.getElement());
            } else {
                jQuery('<div class="small text-body-secondary" style="max-width:720px;"/>')
                .html(AdminListUi.highlight(description, term))
                .appendTo(tdDescription.getElement());
            }

            // status
            const tdStatus = new Td2({value: ''});
            tdStatus.appendTo(tr);

            if (entry.isdeleted) {
                AdminListUi.pill(tdStatus.getElement(), 'Deleted', 'secondary', 'fas fa-trash');
            } else {
                AdminListUi.pill(tdStatus.getElement(), 'Active', 'success', 'fas fa-check-circle');
            }

            // id
            const tdId = new Td2({value: ''});
            tdId.appendTo(tr);
            jQuery('<span class="font-monospace small text-body-secondary"/>').text(`#${entry.id}`).appendTo(tdId.getElement());

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);
            const actions = AdminListUi.actions(tdAction.getElement(), (): void => {
                this._openEdit(entry);
            });

            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actions);

            if (entry.isdeleted) {
                btnMenu.addMenuItem(lang.l('Restore'), (): void => {
                    this._save({...entry, isdeleted: false}, false).then();
                }, 'fas fa-undo');
            } else {
                btnMenu.addMenuItem(lang.l('Delete'), (): void => {
                    this._confirmDelete(entry);
                }, IconFa.trash);
            }

            Lang.i().lAll();
        };

        // filter + sort -----------------------------------------------------------------------------------------------

        const sortValue = (e: EncounterCategorieEntry, key: SortKey): string | number => {
            switch (key) {
                case 'id':
                    return e.id;

                case 'name':
                    return e.name.toLowerCase();

                case 'status':
                    return e.isdeleted ? 1 : 0;
            }

            return 0;
        };

        const matches = (e: EncounterCategorieEntry): boolean => {
            if (!filter.showDeleted && e.isdeleted) {
                return false;
            }

            const term = filter.term.toLowerCase();

            if (term === '') {
                return true;
            }

            return [e.name, e.description ?? '', `${e.id}`].some((value) => value.toLowerCase().includes(term));
        };

        applyFilter = (): void => {
            filteredEntries = allEntries.filter(matches);

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const dir = sort[activeKey] === SortOrder2.DESC ? -1 : 1;

                filteredEntries.sort((a, b) => {
                    const av = sortValue(a, activeKey);
                    const bv = sortValue(b, activeKey);

                    if (av < bv) {
                        return -1 * dir;
                    }

                    if (av > bv) {
                        return Number(dir);
                    }

                    return 0;
                });
            }

            const visible = allEntries.filter((e) => filter.showDeleted || !e.isdeleted).length;
            AdminListUi.setResult(resultInfo, filteredEntries.length, visible);
            AdminListUi.setEmpty(emptyInfo, filteredEntries.length === 0);

            tableWrapper.reset().then();
        };

        const renderStats = (): void => {
            stats.empty();

            const active = allEntries.filter((e) => !e.isdeleted);
            const deleted = allEntries.length - active.length;
            const withDescription = active.filter((e) => (e.description ?? '').trim() !== '').length;

            AdminListUi.stat(stats, 'fas fa-check-circle', `${active.length}`, 'Active', 'text-success');
            AdminListUi.stat(
                stats,
                'fas fa-align-left',
                `${withDescription} / ${active.length}`,
                'with description',
                withDescription === active.length ? 'text-success' : 'text-warning'
            );

            if (deleted > 0) {
                const hint = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary align-self-center"/>').appendTo(stats);
                jQuery('<i class="fas fa-trash me-1"/>').appendTo(hint);
                jQuery('<span/>').text(`${deleted} ${lang.l('deleted – show')}`).appendTo(hint);
                hint.on('click', (): void => {
                    jQuery('#mwpa-encounter-show-deleted').prop('checked', true).trigger('change');
                });
            }
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();

            try {
                allEntries = await EncounterCategoriesAPI.getList();
                card.setTitle(`${lang.l('Encounter Categories')} (${allEntries.filter((e) => !e.isdeleted).length})`);

                renderStats();
                applyFilter?.();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => {
                const offset = page * EncounterCategories._PAGE_SIZE;
                return filteredEntries.slice(offset, offset + EncounterCategories._PAGE_SIZE);
            },
            renderRow,
            false
        );

        this._onLoadTable();
    }

}