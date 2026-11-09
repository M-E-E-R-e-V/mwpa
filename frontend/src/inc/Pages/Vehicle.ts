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
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {Lang} from '../Lang';
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';
import {VehicleEditModal} from './Vehicle/VehicleEditModal';

/**
 * Sortable columns
 */
type SortKey = 'id' | 'name' | 'organization' | 'status';

/**
 * Sort state per column
 */
type SortState = Record<SortKey, SortOrder2>;

/**
 * Status filter of the toolbar
 */
type VehicleStatusFilter = 'all' | 'in_use' | 'out_of_service';

/**
 * Toolbar filter state
 */
type VehicleFilter = {
    term: string;
    organizationId: number;
    status: VehicleStatusFilter;
    showDeleted: boolean;
};

/**
 * Vehicle admin page — manages the fleet (boats). Same look as the species
 * list (see {@link AdminListUi}): toolbar with search, organization and
 * status filter, "show deleted"; summary figures; table with name (click to
 * edit), organization, status pill and quick actions (take out of service /
 * back into service, restore a deleted vehicle, delete).
 *
 * `in_use` drives the operational pickers (sighting, tour); `isdeleted` is
 * the soft delete — historical sightings keep their vehicle reference.
 */
export class Vehicle extends BasePage {

    /**
     * Rows per TableWrapper page
     * @protected
     */
    protected static readonly _PAGE_SIZE = 30;

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

            const name = this._vehicleDialog.getName().trim();

            if (name === '') {
                this._toast.fire({
                    icon: 'error',
                    title: Lang.i().l('Please enter a vehicle name.')
                });
                return;
            }

            const orgId = this._vehicleDialog.getOrganization();

            if (orgId === 0) {
                this._toast.fire({
                    icon: 'error',
                    title: Lang.i().l('Please select an organization.')
                });
                return;
            }

            await this._save({
                id: tid,
                name,
                organization_id: orgId,
                in_use: this._vehicleDialog.getInUse(),
                isdeleted: this._vehicleDialog.getIsDeleted()
            }, true);
        });
    }

    /**
     * Status rank for sorting: in use, out of service, deleted.
     * @param {VehicleEntry} v
     * @return {number}
     * @protected
     */
    protected static _statusRank(v: VehicleEntry): number {
        if (v.isdeleted) {
            return 2;
        }

        return v.in_use ? 0 : 1;
    }

    /**
     * Save a vehicle and refresh the list.
     * @param {VehicleEntry} entry
     * @param {boolean} fromDialog hide the dialog on success
     * @protected
     */
    protected async _save(entry: VehicleEntry, fromDialog: boolean): Promise<void> {
        try {
            if (await VehicleAPI.save(entry)) {
                if (fromDialog) {
                    this._vehicleDialog.hide();
                }

                if (this._onLoadTable) {
                    this._onLoadTable();
                }

                this._toast.fire({
                    icon: 'success',
                    title: Lang.i().l('Vehicle save success.')
                });
            }
        } catch (message) {
            this._toast.fire({
                icon: 'error',
                title: message
            });
        }
    }

    /**
     * Reload the organization dropdown options from the API.
     * @protected
     */
    protected async _refreshOrganizationList(): Promise<void> {
        const orgs = await OrganizationAPI.getOrganizations();
        this._organizations = orgs ?? [];
        this._vehicleDialog.setOrganizationList(this._organizations);
    }

    /**
     * Open the edit dialog for a vehicle.
     * @param {VehicleEntry} vehicle
     * @protected
     */
    protected async _openEdit(vehicle: VehicleEntry): Promise<void> {
        this._vehicleDialog.resetValues();
        this._vehicleDialog.setTitle(new LangTextV2({text: 'Edit Vehicle'}));
        this._vehicleDialog.setVehicleId(vehicle.id);
        this._vehicleDialog.setName(vehicle.name);

        await this._refreshOrganizationList();
        this._vehicleDialog.setOrganization(vehicle.organization_id);
        this._vehicleDialog.setInUse(vehicle.in_use);
        this._vehicleDialog.setIsDeleted(vehicle.isdeleted);

        this._vehicleDialog.show();
    }

    /**
     * Ask and soft-delete a vehicle.
     * @param {VehicleEntry} vehicle
     * @protected
     */
    protected _confirmDelete(vehicle: VehicleEntry): void {
        const lang = Lang.i();

        DialogConfirm2.confirm(
            'dcDeleteVehicle',
            ModalDialogType2.large,
            lang.l('Delete Vehicle'),
            `${lang.l('Are you sure you want to delete the vehicle?')} ${lang.l('Historical sightings keep their reference, but the vehicle disappears from operational pickers.')}`,
            async(_, dialog) => {
                try {
                    if (await VehicleAPI.delete({id: vehicle.id})) {
                        this._toast.fire({
                            icon: 'success',
                            title: lang.l('Vehicle delete success.')
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

        const filter: VehicleFilter = {
            term: '',
            organizationId: 0,
            status: 'all',
            showDeleted: false
        };

        let allVehicles: VehicleEntry[] = [];
        let filteredVehicles: VehicleEntry[] = [];
        let orgNameById = new Map<number, string>();

        // assigned below, used by the toolbar + sort handlers
        let applyFilter: (() => void) | null = null;

        // toolbar -----------------------------------------------------------------------------------------------------

        const toolbar = AdminListUi.toolbar(card.getElement());

        AdminListUi.search(toolbar, 'Search name, organization or id …', (term): void => {
            filter.term = term;
            applyFilter?.();
        });

        const orgSelect = AdminListUi.select(toolbar, 'All organizations', (value): void => {
            filter.organizationId = parseInt(value, 10) || 0;
            applyFilter?.();
        });

        const statusSelect = AdminListUi.select(toolbar, 'Any status', (value): void => {
            filter.status = value === '0' ? 'all' : value as VehicleStatusFilter;
            applyFilter?.();
        });

        AdminListUi.setOptions(statusSelect, [
            {value: 'in_use', label: lang.l('In use')},
            {value: 'out_of_service', label: lang.l('Out of service')}
        ]);

        AdminListUi.switch(toolbar, 'mwpa-vehicle-show-deleted', 'Show deleted', (checked): void => {
            filter.showDeleted = checked;
            applyFilter?.();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);
        const stats = AdminListUi.statsRow(card.getElement());

        // table -------------------------------------------------------------------------------------------------------

        const sort: SortState = {
            id: SortOrder2.NONE,
            name: SortOrder2.ASC,
            organization: SortOrder2.NONE,
            status: SortOrder2.NONE
        };

        const tableWrapper = new TableWrapper2<VehicleEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No vehicles match the current filter.');
        const table = tableWrapper.getTable();
        table.getElement().addClass('table-hover align-middle mb-0');
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

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
                    applyFilter?.();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});

            return column;
        };

        const thIcon = new Th2({value: ''});
        thIcon.appendTo(trhead);
        thIcon.getElement().css('width', '56px');
        new Th2({value: makeSortColumn('Vehicle', 'name')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Organization', 'organization')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Status', 'status')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Id', 'id')}).appendTo(trhead);
        const thAction = new Th2({value: ''});
        thAction.appendTo(trhead);
        thAction.getElement().css('width', '96px');

        const renderRow = (_table: Table2, vehicle: VehicleEntry): void => {
            const term = filter.term;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            if (vehicle.isdeleted) {
                tr.getElement().addClass('opacity-50');
            }

            // icon
            const tdIcon = new Td2({value: ''});
            tdIcon.appendTo(tr);
            const icon = jQuery('<div class="rounded-circle d-flex align-items-center justify-content-center"/>')
            .css({width: '36px', height: '36px'})
            .addClass(vehicle.in_use && !vehicle.isdeleted ? 'bg-primary-subtle text-primary-emphasis' : 'bg-body-tertiary text-body-secondary')
            .appendTo(tdIcon.getElement());
            jQuery('<i class="fas fa-ship"/>').appendTo(icon);

            // name (click → edit)
            const tdName = new Td2({value: ''});
            tdName.appendTo(tr);
            AdminListUi.nameLink(tdName.getElement(), AdminListUi.highlight(vehicle.name, term), (): void => {
                this._openEdit(vehicle).then();
            });

            // organization
            const tdOrg = new Td2({value: ''});
            tdOrg.appendTo(tr);
            const orgName = orgNameById.get(vehicle.organization_id);

            if (orgName === undefined) {
                AdminListUi.pill(tdOrg.getElement(), 'Unknown organization', 'warning', 'fas fa-exclamation-triangle');
            } else {
                const org = jQuery('<span/>').appendTo(tdOrg.getElement());
                jQuery('<i class="fas fa-building me-2 text-body-secondary"/>').appendTo(org);
                jQuery('<span/>').html(AdminListUi.highlight(orgName, term)).appendTo(org);
            }

            // status
            const tdStatus = new Td2({value: ''});
            tdStatus.appendTo(tr);

            if (vehicle.isdeleted) {
                AdminListUi.pill(tdStatus.getElement(), 'Deleted', 'secondary', 'fas fa-trash');
            } else if (vehicle.in_use) {
                AdminListUi.pill(tdStatus.getElement(), 'In use', 'success', 'fas fa-check-circle');
            } else {
                AdminListUi.pill(tdStatus.getElement(), 'Out of service', 'warning', 'fas fa-pause-circle');
            }

            // id
            const tdId = new Td2({value: ''});
            tdId.appendTo(tr);
            jQuery('<span class="font-monospace small text-body-secondary"/>').text(`#${vehicle.id}`).appendTo(tdId.getElement());

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);
            const actions = AdminListUi.actions(tdAction.getElement(), (): void => {
                this._openEdit(vehicle).then();
            });

            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actions);

            if (vehicle.isdeleted) {
                btnMenu.addMenuItem(lang.l('Restore'), (): void => {
                    this._save({...vehicle, isdeleted: false, in_use: true}, false).then();
                }, 'fas fa-undo');
            } else {
                if (vehicle.in_use) {
                    btnMenu.addMenuItem(lang.l('Take out of service'), (): void => {
                        this._save({...vehicle, in_use: false}, false).then();
                    }, 'fas fa-pause-circle');
                } else {
                    btnMenu.addMenuItem(lang.l('Put back into service'), (): void => {
                        this._save({...vehicle, in_use: true}, false).then();
                    }, 'fas fa-play-circle');
                }

                btnMenu.addDivider();

                btnMenu.addMenuItem(lang.l('Delete'), (): void => {
                    this._confirmDelete(vehicle);
                }, IconFa.trash);
            }

            Lang.i().lAll();
        };

        // filter + sort -----------------------------------------------------------------------------------------------

        const sortValue = (v: VehicleEntry, key: SortKey): string | number => {
            switch (key) {
                case 'id':
                    return v.id;

                case 'name':
                    return v.name.toLowerCase();

                case 'organization':
                    return (orgNameById.get(v.organization_id) ?? '').toLowerCase();

                case 'status':
                    return Vehicle._statusRank(v);
            }

            return 0;
        };

        const matches = (v: VehicleEntry): boolean => {
            if (!filter.showDeleted && v.isdeleted) {
                return false;
            }

            if (filter.organizationId !== 0 && v.organization_id !== filter.organizationId) {
                return false;
            }

            if (filter.status === 'in_use' && !(v.in_use && !v.isdeleted)) {
                return false;
            }

            if (filter.status === 'out_of_service' && (v.in_use || v.isdeleted)) {
                return false;
            }

            const term = filter.term.toLowerCase();

            if (term === '') {
                return true;
            }

            return [v.name, orgNameById.get(v.organization_id) ?? '', `${v.id}`]
            .some((value) => value.toLowerCase().includes(term));
        };

        applyFilter = (): void => {
            filteredVehicles = allVehicles.filter(matches);

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const dir = sort[activeKey] === SortOrder2.DESC ? -1 : 1;

                filteredVehicles.sort((a, b) => {
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

            const visible = allVehicles.filter((v) => filter.showDeleted || !v.isdeleted).length;
            AdminListUi.setResult(resultInfo, filteredVehicles.length, visible);
            AdminListUi.setEmpty(emptyInfo, filteredVehicles.length === 0);

            tableWrapper.reset().then();
        };

        const renderStats = (): void => {
            stats.empty();

            const inUse = allVehicles.filter((v) => v.in_use && !v.isdeleted).length;
            const outOfService = allVehicles.filter((v) => !v.in_use && !v.isdeleted).length;
            const deleted = allVehicles.filter((v) => v.isdeleted).length;
            const orgCount = new Set(allVehicles.filter((v) => !v.isdeleted).map((v) => v.organization_id)).size;

            AdminListUi.stat(stats, 'fas fa-check-circle', `${inUse}`, 'In use', 'text-success');
            AdminListUi.stat(stats, 'fas fa-pause-circle', `${outOfService}`, 'Out of service', outOfService > 0 ? 'text-warning' : 'text-body-secondary');
            AdminListUi.stat(stats, 'fas fa-building', `${orgCount}`, 'Organizations');

            if (deleted > 0) {
                const hint = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary align-self-center"/>').appendTo(stats);
                jQuery('<i class="fas fa-trash me-1"/>').appendTo(hint);
                jQuery('<span/>').text(`${deleted} ${lang.l('deleted – show')}`).appendTo(hint);
                hint.on('click', (): void => {
                    jQuery('#mwpa-vehicle-show-deleted').prop('checked', true).trigger('change');
                });
            }
        };

        /*
         * Reload everything (vehicles + orgs). Hooked to the page's
         * _onLoadTable contract so save/delete can trigger a refresh.
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

                card.setTitle(`${lang.l('Vehicles')} (${allVehicles.filter((v) => !v.isdeleted).length})`);

                AdminListUi.setOptions(orgSelect, this._organizations.map((o) => ({value: `${o.id}`, label: o.description})));

                renderStats();
                applyFilter?.();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => {
                const offset = page * Vehicle._PAGE_SIZE;
                return filteredVehicles.slice(offset, offset + Vehicle._PAGE_SIZE);
            },
            renderRow,
            false
        );

        // Initial load
        this._onLoadTable();
    }

}