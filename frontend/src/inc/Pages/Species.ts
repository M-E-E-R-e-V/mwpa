/* global JQuery */
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
import {Species as SpeciesAPI, SpeciesEntry, SpeciesMerge} from '../Api/Species';
import {SpeciesGroup as SpeciesGroupAPI} from '../Api/SpeciesGroup';
import {Lang} from '../Lang';
import {Nav} from '../Nav';
import {UtilOttLink} from '../Utils/UtilOttLink';
import {SpeciesNameParts, UtilSpeciesName} from '../Utils/UtilSpeciesName';
import {UtilSpeciesSilhouette} from '../Utils/UtilSpeciesSilhouette';
import {UtilWormsLink} from '../Utils/UtilWormsLink';
import {AdminListUi} from '../Widget/AdminListUi';
import {SpeciesGroupDisplay} from '../Widget/SpeciesGroupDisplay';
import {BasePage} from './BasePage';
import {SpeciesProfile as SpeciesProfilePage} from './Species/Profile';
import {SPECIES_PAGE_NAME} from './PageNames';
import {SpeciesEditModal} from './Species/SpeciesEditModal';
import {SpeciesMergeModal} from './Species/SpeciesMergeModal';

/**
 * Sortable columns
 */
type SortKey = 'id' | 'name' | 'scientific' | 'group' | 'taxonomy';

/**
 * Sort state per column
 */
type SortState = Record<SortKey, SortOrder2>;

/**
 * Species entry with its parsed name parts (computed once per load).
 */
type SpeciesRow = {
    entry: SpeciesEntry;
    name: SpeciesNameParts;
};

/**
 * Toolbar filter state
 */
type SpeciesFilter = {
    term: string;
    groupId: number;
    incompleteOnly: boolean;
    showDeleted: boolean;
};

/**
 * Species admin page. Client-side list (the species table is small): a
 * toolbar with search, group filter and data-quality toggles, summary
 * figures (how many species have WoRMS / OTT ids and an own image), and a
 * table with picture, common + local name, scientific name, group and the
 * taxonomy ids as links (missing ids are flagged).
 */
export class Species extends BasePage {

    public static NAME: string = SPECIES_PAGE_NAME;

    /**
     * Rows per TableWrapper page
     * @protected
     */
    protected static readonly _PAGE_SIZE = 30;

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
                    const imageError = await this._saveImage(tid);

                    if (imageError !== null) {
                        this._toast.fire({icon: 'error', title: `${Lang.i().l('Image could not be saved')}: ${Lang.i().l(imageError)}`});
                        return;
                    }

                    this._speciesDialog.hide();
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }
                    this._toast.fire({icon: 'success', title: Lang.i().l('Specie save success.')});
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

    /**
     * True when a taxonomy id is missing.
     * @param {SpeciesEntry} entry
     * @return {boolean}
     * @protected
     */
    protected static _isIncomplete(entry: SpeciesEntry): boolean {
        return (entry.aphiaid ?? 0) === 0 || entry.ottid === 0;
    }

    /**
     * Small taxonomy id pill: link-styled when set, warning when missing.
     * @param {JQuery} parent
     * @param {string} label e.g. "WoRMS"
     * @param {number} id
     * @return {JQuery}
     * @protected
     */
    protected static _taxonPill(parent: JQuery, label: string, id: number): JQuery {
        const pill = jQuery('<span class="badge rounded-pill border me-1 mb-1 fw-normal"/>').appendTo(parent);

        if (id > 0) {
            pill.addClass('text-primary-emphasis bg-primary-subtle border-primary-subtle');
            jQuery('<span class="fw-semibold me-1"/>').text(label).appendTo(pill);
            jQuery('<span class="font-monospace"/>').text(`${id}`).appendTo(pill);
            jQuery('<i class="fas fa-external-link-alt ms-1 small"/>').appendTo(pill);
        } else {
            pill.addClass('text-warning-emphasis bg-warning-subtle border-warning-subtle');
            jQuery('<i class="fas fa-exclamation-triangle me-1"/>').appendTo(pill);
            jQuery('<span/>').text(`${label} ${Lang.i().l('missing')}`).appendTo(pill);
        }

        return pill;
    }

    /**
     * Summary figure "value / total" (green icon when complete).
     * @param {JQuery} parent
     * @param {string} icon
     * @param {number} value
     * @param {number} total
     * @param {string} label English source text
     * @protected
     */
    protected static _statOf(parent: JQuery, icon: string, value: number, total: number, label: string): void {
        AdminListUi.stat(parent, icon, `${value} / ${total}`, label, value === total ? 'text-success' : 'text-body-secondary');
    }

    /**
     * Upload / remove the species image chosen in the dialog (existing species only).
     * @param {number} id species id
     * @return {Promise<string|null>} null = ok, otherwise error message
     * @protected
     */
    protected async _saveImage(id: number): Promise<string | null> {
        if (id === 0) {
            return null;
        }

        const file = this._speciesDialog.getPendingImage();

        if (file !== null) {
            return SpeciesAPI.uploadImage(id, file);
        }

        if (this._speciesDialog.isImageRemoved() && !await SpeciesAPI.deleteImage(id)) {
            return 'Request failed';
        }

        return null;
    }

    /**
     * Open the edit dialog for a species.
     * @param {SpeciesEntry} specie
     * @protected
     */
    protected async _openEdit(specie: SpeciesEntry): Promise<void> {
        this._speciesDialog.resetValues();
        this._speciesDialog.setTitle(new LangTextV2({text: 'Edit Species'}));
        this._speciesDialog.setSpecieId(specie.id);
        this._speciesDialog.setName(specie.name);
        this._speciesDialog.setOttId(specie.ottid);
        this._speciesDialog.setAphiaId(specie.aphiaid ?? 0);
        this._speciesDialog.setImageUrl(SpeciesAPI.imageUrl(specie));

        const groups = await SpeciesGroupAPI.getList();
        if (groups) {
            this._speciesDialog.setSpeciesGroupList(groups);
        }

        this._speciesDialog.setSpeciesGroup(specie.species_groupid);
        this._speciesDialog.show();
    }

    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add species', 'fas fa-plus', async() => {
            this._speciesDialog.resetValues();
            this._speciesDialog.setTitle(new LangTextV2({text: 'Add species'}));

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

        const filter: SpeciesFilter = {
            term: '',
            groupId: 0,
            incompleteOnly: false,
            showDeleted: false
        };

        // toolbar -----------------------------------------------------------------------------------------------------

        // assigned below, used by the toolbar + sort handlers
        let applyFilter: (() => void) | null = null;

        const toolbar = AdminListUi.toolbar(card.getElement());

        AdminListUi.search(toolbar, 'Search name, Latin name, group or id …', (term): void => {
            filter.term = term;
            applyFilter?.();
        });

        const groupSelect = AdminListUi.select(toolbar, 'All groups', (value): void => {
            filter.groupId = parseInt(value, 10) || 0;
            applyFilter?.();
        });

        const incompleteSwitch = AdminListUi.switch(toolbar, 'mwpa-species-only-incomplete', 'Only incomplete', (checked): void => {
            filter.incompleteOnly = checked;
            applyFilter?.();
        });

        AdminListUi.switch(toolbar, 'mwpa-species-show-deleted', 'Show deleted', (checked): void => {
            filter.showDeleted = checked;
            applyFilter?.();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);
        const stats = AdminListUi.statsRow(card.getElement());

        // table -------------------------------------------------------------------------------------------------------

        const sort: SortState = {
            id: SortOrder2.NONE,
            name: SortOrder2.ASC,
            scientific: SortOrder2.NONE,
            group: SortOrder2.NONE,
            taxonomy: SortOrder2.NONE
        };

        let allRows: SpeciesRow[] = [];
        let filteredRows: SpeciesRow[] = [];

        const tableWrapper = new TableWrapper2<SpeciesRow>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No species match the current filter.');

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

        const thPicture = new Th2({value: ''});
        thPicture.appendTo(trhead);
        thPicture.getElement().css('width', '72px');
        new Th2({value: makeSortColumn('Species', 'name')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Scientific name', 'scientific')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Group', 'group')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Taxonomy', 'taxonomy')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Id', 'id')}).appendTo(trhead);
        const thAction = new Th2({value: ''});
        thAction.appendTo(trhead);
        thAction.getElement().css('width', '96px');

        const renderRow = (_table: Table2, row: SpeciesRow): void => {
            const specie = row.entry;
            const term = filter.term;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            if (specie.isdeleted) {
                tr.getElement().addClass('opacity-50');
            }

            // picture
            const tdPicture = new Td2({value: ''});
            tdPicture.appendTo(tr);
            const picture = jQuery('<div class="border rounded bg-body-tertiary d-flex align-items-center justify-content-center p-1"/>')
            .css({width: '56px', height: '44px'})
            .appendTo(tdPicture.getElement());
            picture[0]?.insertAdjacentHTML('beforeend', UtilSpeciesSilhouette.img(specie.name, 34, SpeciesAPI.imageUrl(specie)));

            if (specie.image) {
                picture.attr('title', lang.l('Own image'));
            } else {
                picture.addClass('opacity-75').attr('title', lang.l('No own image – automatic silhouette by name.'));
            }

            // common + local name (click → edit)
            const tdName = new Td2({value: ''});
            tdName.appendTo(tr);
            const nameLink = jQuery('<a href="#" class="fw-semibold text-decoration-none text-body"/>')
            .html(AdminListUi.highlight(row.name.common, term))
            .appendTo(tdName.getElement());
            nameLink.on('click', (e): void => {
                e.preventDefault();
                this._openEdit(specie).then();
            });

            if (specie.isdeleted) {
                jQuery('<span class="badge text-bg-secondary ms-2"/>').text(lang.l('Deleted')).appendTo(tdName.getElement());
            }

            if (row.name.local !== '') {
                jQuery('<div class="small text-body-secondary"/>').html(AdminListUi.highlight(row.name.local, term)).appendTo(tdName.getElement());
            }

            // scientific name
            const tdScientific = new Td2({value: ''});
            tdScientific.appendTo(tr);

            if (row.name.scientific === '') {
                jQuery('<span class="small text-body-tertiary"/>').text('—').appendTo(tdScientific.getElement());
            } else {
                jQuery('<i/>').html(AdminListUi.highlight(row.name.scientific, term)).appendTo(tdScientific.getElement());
            }

            // group
            const tdGroup = new Td2({value: ''});
            tdGroup.appendTo(tr);

            if (specie.species_group && specie.species_group.name !== '') {
                // eslint-disable-next-line no-new
                new SpeciesGroupDisplay(tdGroup.getElement(), specie.species_group);
            } else {
                jQuery('<span class="small text-body-tertiary"/>').text(lang.l('No group')).appendTo(tdGroup.getElement());
            }

            // taxonomy ids
            const tdTaxonomy = new Td2({value: ''});
            tdTaxonomy.appendTo(tr);
            const aphiaId = specie.aphiaid ?? 0;
            const worms = Species._taxonPill(tdTaxonomy.getElement(), 'WoRMS', aphiaId);

            if (aphiaId > 0) {
                UtilWormsLink.setDialog(worms, specie.name, aphiaId);
                worms.attr('title', lang.l('Open on marinespecies.org'));
            }

            const ott = Species._taxonPill(tdTaxonomy.getElement(), 'OTT', specie.ottid);

            if (specie.ottid > 0) {
                UtilOttLink.setDialog(ott, specie.name, specie.ottid);
                ott.attr('title', lang.l('Open on Open Tree of Life'));
            }

            // id
            const tdId = new Td2({value: ''});
            tdId.appendTo(tr);
            jQuery('<span class="font-monospace small text-body-secondary"/>').text(`#${specie.id}`).appendTo(tdId.getElement());

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);
            const actions = jQuery('<div class="d-flex justify-content-end align-items-center gap-1"/>').appendTo(tdAction.getElement());

            const editBtn = jQuery('<button type="button" class="btn btn-sm btn-outline-primary"/>')
            .attr('title', lang.l('Edit'))
            .appendTo(actions);
            jQuery('<i class="fas fa-edit"/>').appendTo(editBtn);
            editBtn.on('click', (): void => {
                this._openEdit(specie).then();
            });

            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actions);

            btnMenu.addMenuItem(lang.l('Profile'), (): void => {
                Nav.load(new SpeciesProfilePage(specie.id)).then();
            }, 'fas fa-chart-bar');

            btnMenu.addMenuItem(lang.l('Merge'), async(): Promise<void> => {
                this._mergeDialog.resetValues();
                this._mergeDialog.setTitle(new LangTextV2({text: 'Merge Species'}));

                const tspecies = await SpeciesAPI.getList();
                if (tspecies) {
                    this._mergeDialog.setSpecies(tspecies);
                }

                this._mergeDialog.setSourceSpecie(`${specie.id}`);
                this._mergeDialog.show();
            }, 'fas fa-compress-arrows-alt');

            btnMenu.addDivider();

            btnMenu.addMenuItem(lang.l('Delete'), (): void => {
                DialogConfirm2.confirm(
                    'dcDeleteSpecie',
                    ModalDialogType2.large,
                    lang.l('Delete Specie'),
                    lang.l('Are you sure you want to delete the specie?'),
                    async(_, dialog) => {
                        try {
                            if (await SpeciesAPI.delete({id: specie.id})) {
                                this._toast.fire({icon: 'success', title: lang.l('Specie delete success.')});
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

        // filter + sort -----------------------------------------------------------------------------------------------

        const sortValue = (row: SpeciesRow, key: SortKey): string | number => {
            switch (key) {
                case 'id':
                    return row.entry.id;

                case 'name':
                    return row.name.common.toLowerCase();

                case 'scientific':
                    // rows without a scientific name go last
                    return row.name.scientific === '' ? '￿' : row.name.scientific.toLowerCase();

                case 'group':
                    return (row.entry.species_group?.name ?? '').toLowerCase();

                case 'taxonomy':
                    return row.entry.aphiaid ?? 0;
            }

            return 0;
        };

        const matches = (row: SpeciesRow): boolean => {
            const entry = row.entry;

            if (!filter.showDeleted && entry.isdeleted) {
                return false;
            }

            if (filter.groupId !== 0 && entry.species_groupid !== filter.groupId) {
                return false;
            }

            if (filter.incompleteOnly && !Species._isIncomplete(entry)) {
                return false;
            }

            const term = filter.term.toLowerCase();

            if (term === '') {
                return true;
            }

            return [
                entry.name,
                row.name.scientific,
                entry.species_group?.name ?? '',
                `${entry.id}`,
                `${entry.ottid}`,
                `${entry.aphiaid ?? 0}`
            ].some((value) => value.toLowerCase().includes(term));
        };

        applyFilter = (): void => {
            filteredRows = allRows.filter(matches);

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const dir = sort[activeKey] === SortOrder2.DESC ? -1 : 1;

                filteredRows.sort((a, b) => {
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

            const visible = allRows.filter((r) => filter.showDeleted || !r.entry.isdeleted).length;
            AdminListUi.setResult(resultInfo, filteredRows.length, visible);
            AdminListUi.setEmpty(emptyInfo, filteredRows.length === 0);

            tableWrapper.reset().then();
        };

        const renderStats = (): void => {
            stats.empty();
            const active = allRows.filter((r) => !r.entry.isdeleted).map((r) => r.entry);
            const total = active.length;

            Species._statOf(stats, 'fas fa-fish', active.filter((e) => (e.aphiaid ?? 0) > 0).length, total, 'with WoRMS AphiaID');
            Species._statOf(stats, 'fas fa-tree', active.filter((e) => e.ottid > 0).length, total, 'with OTT ID');
            Species._statOf(stats, 'fas fa-image', active.filter((e) => Boolean(e.image)).length, total, 'with own image');

            const missing = active.filter((e) => Species._isIncomplete(e)).length;

            if (missing > 0) {
                const hint = jQuery('<button type="button" class="btn btn-sm btn-outline-warning align-self-center"/>').appendTo(stats);
                jQuery('<i class="fas fa-exclamation-triangle me-1"/>').appendTo(hint);
                jQuery('<span/>').text(`${missing} ${lang.l('incomplete – show')}`).appendTo(hint);
                hint.on('click', (): void => {
                    incompleteSwitch.prop('checked', true).trigger('change');
                });
            }
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            try {
                const [species, groups] = await Promise.all([SpeciesAPI.getList(), SpeciesGroupAPI.getList()]);

                allRows = (species ?? []).map((entry) => ({entry, name: UtilSpeciesName.parse(entry.name)}));
                card.setTitle(`${lang.l('Species')} (${allRows.filter((r) => !r.entry.isdeleted).length})`);

                AdminListUi.setOptions(groupSelect, (groups ?? []).map((g) => ({value: `${g.id}`, label: g.name})));

                renderStats();
                applyFilter?.();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => {
                const offset = page * Species._PAGE_SIZE;
                return filteredRows.slice(offset, offset + Species._PAGE_SIZE);
            },
            renderRow,
            false
        );

        this._onLoadTable();
    }

}