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
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {VehicleEditModal} from './Vehicle/VehicleEditModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'name' | 'organization' | 'status';

type SortState = Record<SortKey, SortOrder>;

const escapeHtml = (s: string): string => s
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');

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

    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(safe, 'giu'), (match) => `<mark>${match}</mark>`);
};

/**
 * Numeric status rank for sorting — `in use` first (0), `not in use` second
 * (1), `deleted` last (2). Keeps the most relevant rows on top.
 */
const statusRank = (v: VehicleEntry): number => {
    if (v.isdeleted) return 2;
    if (!v.in_use) return 1;
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

        this._vehicleDialog = new VehicleEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Vehicle', async() => {
            this._vehicleDialog.resetValues();
            this._vehicleDialog.setTitle(new LangText('Add Vehicle'));

            await this._refreshOrganizationList();
            this._vehicleDialog.setInUse(true);
            this._vehicleDialog.setIsDeleted(false);
            this._vehicleDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // save --------------------------------------------------------------------------------------------------------

        this._vehicleDialog.setOnSave(async(): Promise<void> => {
            let tid = this._vehicleDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            const orgId = this._vehicleDialog.getOrganization();

            if (orgId === 0) {
                this._toast.fire({
                    icon: 'error',
                    title: 'Please select an organization.'
                });
                return;
            }

            const name = this._vehicleDialog.getName().trim();

            if (name === '') {
                this._toast.fire({
                    icon: 'error',
                    title: 'Please enter a vehicle name.'
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
        const lang = Lang.i();

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle(new LangText('Vehicles'));

        // In-header quick search — same affordance as the Sighting list.
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new InputBottemBorderOnly2(searchSlot, undefined, InputType.text);
        searchInput.setPlaceholder(`${lang.l('search name / organization …')}`);

        // Sort state — single-column sort, default by id descending so the
        // newest vehicle surfaces at the top.
        const sort: SortState = {
            id: SortOrder.DESC,
            name: SortOrder.NONE,
            organization: SortOrder.NONE,
            status: SortOrder.NONE
        };

        let searchTerm = '';
        let allVehicles: VehicleEntry[] = [];
        let orgNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper<VehicleEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // Sort registry — keeps single-column behaviour clean: clicking a header
        // resets every other registered header's indicator and state.
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
        new Th(trhead, makeSortColumn('Organization', 'organization'));

        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Status', 'status'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, vehicle: VehicleEntry): void => {
            const trbody = new Tr(table.getTbody());
            const term = searchTerm;

            // eslint-disable-next-line no-new
            new Td(trbody, `#${vehicle.id}`);

            const nameTd = new Td(trbody, '');
            nameTd.getElement().html(`<b>${highlight(vehicle.name, term)}</b>`);

            const orgName = orgNameById.get(vehicle.organization_id) ?? `#${vehicle.organization_id}`;
            const orgTd = new Td(trbody, '');
            orgTd.getElement().html(highlight(orgName, term));

            const statusTd = new Td(trbody, '');

            if (vehicle.isdeleted) {
                // eslint-disable-next-line no-new
                new Badge(statusTd, lang.l('deleted') ?? 'deleted', BadgeType.secondary);
            } else if (vehicle.in_use) {
                // eslint-disable-next-line no-new
                new Badge(statusTd, lang.l('in use') ?? 'in use', BadgeType.success);
            } else {
                // eslint-disable-next-line no-new
                new Badge(statusTd, lang.l('not in use') ?? 'not in use', BadgeType.warning);
            }

            const tdAction = new Td(trbody, '');

            const btnRMenu = new ButtonMenu(
                tdAction.getElement(),
                IconFa.bars,
                true,
                ButtonType.borderless
            );

            btnRMenu.addMenuItem('Edit', async(): Promise<void> => {
                this._vehicleDialog.resetValues();
                this._vehicleDialog.setTitle(new LangText('Edit Vehicle'));
                this._vehicleDialog.setId(vehicle.id);
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
                    DialogConfirm.confirm(
                        'dcDeleteVehicle',
                        ModalDialogType.large,
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
                        ButtonClass.danger
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
                        case 'organization':
                            av = (orgNameById.get(a.organization_id) ?? '').toLowerCase();
                            bv = (orgNameById.get(b.organization_id) ?? '').toLowerCase();
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

        // Reload everything (vehicles + orgs) and reset the wrapper so the
        // first page renders. Hooked to the page's _onLoadTable contract so
        // save/delete can trigger a refresh.
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

        // Debounced quick-search — same 300 ms cadence as the Sighting page
        // so the typing rhythm feels consistent across admin lists.
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