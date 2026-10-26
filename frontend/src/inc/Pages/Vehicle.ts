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
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {VehicleEditModal} from './Vehicle/VehicleEditModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'name' | 'organization' | 'status';

type SortState = Record<SortKey, SortOrder2>;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

/**
 * Wrap any (case-insensitive) match of `term` in `<mark>` so search hits are
 * highlighted in the rendered cells.
 */
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
 * Numeric status rank for sorting — `in use` first (0), `not in use` second
 * (1), `deleted` last (2). Keeps the most relevant rows on top.
 */
const statusRank = (v: VehicleEntry): number => {
    if (v.isdeleted) {return 2;}
    if (!v.in_use) {return 1;}
    return 0;
};

/**
 * Vehicle admin page — manages the fleet (boats).
 *
 * The list mirrors the modern Sighting-page look: TableWrapper with infinite
 * scroll, single-column sort, in-header quick search across name + organization,
 * and per-row status badges. The Edit modal exposes both the `in_use`
 * (operational visibility) and `isdeleted` (soft-delete) flags independently.
 */
export class Vehicle extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'admin-vehicle';

    /**
     * Vehicle edit modal
     * @protected
     */
    protected _vehicleDialog: VehicleEditModal;

    /**
     * Cached organization list — refreshed on every "Add" / "Edit" click so
     * the dropdown stays in sync if an admin adds a new org in another tab.
     * @protected
     */
    protected _organizations: OrganizationFullEntry[] = [];

    /**
     * constructor
     */
    public constructor() {
        super();

        this._vehicleDialog = new VehicleEditModal();

        // save --------------------------------------------------------------------------------------------------------

        this._vehicleDialog.setOnSave(async(): Promise<void> => {
            let tid = this._vehicleDialog.getVehicleId();

            if (tid === null) {
                tid = 0;
            }

            const orgId = this._vehicleDialog.getOrganization();

            if (orgId === 0) {
                this._toast.fire({
                    icon: 'error',
                    title: Lang.i().l('Please select an organization.')
                });
                return;
            }

            const name = this._vehicleDialog.getName().trim();

            if (name === '') {
                this._toast.fire({
                    icon: 'error',
                    title: Lang.i().l('Please enter a vehicle name.')
                });
                return;
            }

            try {
                const entry: VehicleEntry = {
                    id: tid,
                    name,
                    organization_id: orgId,
                    in_use: this._vehicleDialog.getInUse(),
                    isdeleted: this._vehicleDialog.getIsDeleted()
                };

                if (await VehicleAPI.save(entry)) {
                    this._vehicleDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Vehicle save success.'
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
     * Reload the organization dropdown options from the API.
     * @private
     */
    private async _refreshOrganizationList(): Promise<void> {
        const orgs = await OrganizationAPI.getOrganizations();
        this._organizations = orgs ?? [];
        this._vehicleDialog.setOrganizationList(this._organizations);
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add Vehicle', 'fas fa-plus', async() => {
            this._vehicleDialog.resetValues();
            this._vehicleDialog.setTitle(new LangTextV2({text: 'Add Vehicle'}));

            await this._refreshOrganizationList();
            this._vehicleDialog.setInUse(true);
            this._vehicleDialog.setIsDeleted(false);
            this._vehicleDialog.show();
        });

        const lang = Lang.i();

        const content = this._wrapper.getContentWrapper().getContent();
        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());

        card.setTitle(new LangTextV2({text: 'Vehicles'}));

        // In-header quick search — same affordance as the Sighting list.
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new Input2({type: InputType2.text});
        searchInput.appendTo(searchSlot);
        searchInput.setPlaceholder(`${lang.l('search name / organization …')}`);

        /*
         * Sort state — single-column sort, default by id descending so the
         * newest vehicle surfaces at the top.
         */
        const sort: SortState = {
            id: SortOrder2.DESC,
            name: SortOrder2.NONE,
            organization: SortOrder2.NONE,
            status: SortOrder2.NONE
        };

        let searchTerm = '';
        let allVehicles: VehicleEntry[] = [];
        let orgNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper2<VehicleEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        /*
         * Sort registry — keeps single-column behaviour clean: clicking a header
         * resets every other registered header's indicator and state.
         */
        const sortRegistry: {key: SortKey; column: LangTextV2;}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangTextV2 => {
            const column = new LangTextV2({
                text: label,
                onClick: (langText): void => {
                    const newValue = SortingColumn2.changeSort(langText, sort[key]);

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
        new Th2({value: makeSortColumn('Organization', 'organization')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Status', 'status')}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Action'})}).appendTo(trhead);

        const renderRow = (_table: Table2, vehicle: VehicleEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());
            const term = searchTerm;

            new Td2({value: `#${vehicle.id}`}).appendTo(trbody);

            new Td2({value: `<b>${highlight(vehicle.name, term)}</b>`}).appendTo(trbody);

            const orgName = orgNameById.get(vehicle.organization_id) ?? `#${vehicle.organization_id}`;
            new Td2({value: highlight(orgName, term)}).appendTo(trbody);

            const statusTd = new Td2({value: ''});
            statusTd.appendTo(trbody);

            if (vehicle.isdeleted) {
                new Badge2({text: lang.l('deleted') ?? 'deleted', type: BadgeType2.secondary}).appendTo(statusTd);
            } else if (vehicle.in_use) {
                new Badge2({text: lang.l('in use') ?? 'in use', type: BadgeType2.success}).appendTo(statusTd);
            } else {
                new Badge2({text: lang.l('not in use') ?? 'not in use', type: BadgeType2.warning}).appendTo(statusTd);
            }

            const tdAction = new Td2({value: ''});
            tdAction.appendTo(trbody);

            const btnRMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnRMenu.appendTo(tdAction);

            btnRMenu.addMenuItem('Edit', async(): Promise<void> => {
                this._vehicleDialog.resetValues();
                this._vehicleDialog.setTitle(new LangTextV2({text: 'Edit Vehicle'}));
                this._vehicleDialog.setVehicleId(vehicle.id);
                this._vehicleDialog.setName(vehicle.name);

                await this._refreshOrganizationList();
                this._vehicleDialog.setOrganization(vehicle.organization_id);
                this._vehicleDialog.setInUse(vehicle.in_use);
                this._vehicleDialog.setIsDeleted(vehicle.isdeleted);

                this._vehicleDialog.show();
            }, IconFa.edit);

            btnRMenu.addDivider();

            btnRMenu.addMenuItem(
                'Delete',
                (): void => {
                    DialogConfirm2.confirm(
                        'dcDeleteVehicle',
                        ModalDialogType2.large,
                        'Delete Vehicle',
                        'Are you sure you want to delete the vehicle?'
                        + ' Historical sightings keep their reference, but the vehicle disappears from operational pickers.',
                        async(_, dialog) => {
                            try {
                                if (await VehicleAPI.delete({id: vehicle.id})) {
                                    this._toast.fire({
                                        icon: 'success',
                                        title: 'Vehicle delete success.'
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
                        ButtonClass2.danger
                    );
                },
                IconFa.trash
            );

            Lang.i().lAll();
        };

        // Filter + sort the in-memory list, then feed pages to TableWrapper.
        const buildPage = (page: number): VehicleEntry[] => {
            const term = searchTerm.toLowerCase();

            const filtered = term === ''
                ? allVehicles.slice()
                : allVehicles.filter((v) => {
                    if (v.name.toLowerCase().includes(term)) {
                        return true;
                    }
                    const org = (orgNameById.get(v.organization_id) ?? '').toLowerCase();
                    return org.includes(term);
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
                        case 'organization':
                            av = (orgNameById.get(a.organization_id) ?? '').toLowerCase();
                            bv = (orgNameById.get(b.organization_id) ?? '').toLowerCase();
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

        /*
         * Reload everything (vehicles + orgs) and reset the wrapper so the
         * first page renders. Hooked to the page's _onLoadTable contract so
         * save/delete can trigger a refresh.
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();

            try {
                const [vehicles, orgs] = await Promise.all([
                    VehicleAPI.getList(),
                    OrganizationAPI.getOrganizations()
                ]);

                allVehicles = vehicles ?? [];
                this._organizations = orgs ?? [];

                orgNameById = new Map<number, string>();
                for (const o of this._organizations) {
                    orgNameById.set(o.id, o.description);
                }

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

        /*
         * Debounced quick-search — same 300 ms cadence as the Sighting page
         * so the typing rhythm feels consistent across admin lists.
         */
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

        // Initial load
        this._onLoadTable();
    }

}