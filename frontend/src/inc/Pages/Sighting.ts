/* global JQuery */
/*
 * presetPage() returns an anonymous subclass per saved filter (the side menu
 * instantiates its entries without arguments) — a second class by design.
 */
/* eslint-disable max-classes-per-file */
import {
    ButtonClass2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    ContextMenu2,
    DialogConfirm2,
    DialogInfo2,
    IconFa,
    LangTextV2,
    ModalDialogType2,
    SelectOption2,
    SortingColumn2,
    SortOrder2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tooltip2,
    Tr2
} from 'bambooo';
import moment from 'moment';
import {ProtectedAreaData, SightingTableFilterSettings} from 'mwpa_schemas';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat} from 'ol/proj';
import {BehaviouralStateEntry, BehaviouralStates as BehaviouralStatesAPI} from '../Api/BehaviouralStates';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Organization as OrganizationAPI, OrganizationEntry} from '../Api/Organization';
import {ProtectedArea as ProtectedAreaAPI} from '../Api/ProtectedArea';
import {SightingMovement as SightingMovementAPI} from '../Api/SightingMovement';
import {TABLE_FILTER_SIGHTING, TableFilter as TableFilterAPI, TableFilterEntry} from '../Api/TableFilter';
import {SightingFishingVessel as SightingFishingVesselAPI, SightingFishingVesselEntry} from '../Api/SightingFishingVessel';
import {Sightings as SightingsAPI, SightingsEntry, SightingsFilter} from '../Api/Sightings';
import {Species as SpeciesAPI, SpeciesEntry} from '../Api/Species';
import {User as UserAPI} from '../Api/User';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {Lang} from '../Lang';
import {Nav} from '../Nav';
import {UtilDistanceCoast} from '../Utils/UtilDistanceCoast';
import {UtilLocation} from '../Utils/UtilLocation';
import {TableFilterModal, TableFilterModalConfig, TableFilterModalValues} from '../Widget/TableFilter/TableFilterModal';
import {UtilSelect} from '../Utils/UtilSelect';
import {AdminListUi} from '../Widget/AdminListUi';
import {SightingPopup, SightingPopupLookups} from '../Utils/SightingPopup';
import {UtilSpeciesSilhouette} from '../Utils/UtilSpeciesSilhouette';
import {LocationDisplay} from '../Widget/LocationDisplay';
import {ReactionDisplay} from '../Widget/ReactionDisplay';
import {SightingAnalytics} from '../Widget/SightingAnalytics';
import {SightingDashboard} from '../Widget/SightingDashboard';
import {SightingExport} from '../Widget/SightingExport';
import {SightingMap, SightingMapDisplayMode, SightingMapObjectType} from '../Widget/SightingMap';
import {SightingYearCompare} from '../Widget/SightingYearCompare';
import {SpeciesDisplay} from '../Widget/SpeciesDisplay';
import {BasePage} from './BasePage';
import {SpeciesProfile as SpeciesProfilePage} from './Species/Profile';
import {SightingDeletedModal} from './Sighting/SightingDeletedModal';
import {SightingEditModal} from './Sighting/SightingEditModal';
import {SightingFilterValues, SightingSortKey, SightingTableFilter} from './Sighting/SightingTableFilter';
import {ToursMap} from './Tours/TourMap';

type SortKey = SightingSortKey;

type SortState = Record<SortKey, SortOrder2>;

/**
 * Sighting page.
 */
export class Sighting extends BasePage {

    /**
     * Side menu name of the plain list
     */
    public static readonly MENU_NAME = 'sighting';

    /**
     * Side menu name of the group (plain list + saved filters)
     */
    public static readonly MENU_GROUP_NAME = 'sighting-group';

    /**
     * Shared preset context menu (one DOM node for all page instances)
     * @protected
     */
    protected static _filterMenu: ContextMenu2|null = null;

    /**
     * Shared filter dialog
     * @protected
     */
    protected static _filterModal: TableFilterModal|null = null;

    /**
     * Rows per server page (infinite scroll)
     * @protected
     */
    protected static readonly _PAGE_SIZE = 30;

    protected override _name: string = Sighting.MENU_NAME;

    /**
     * Saved preset shown by this page instance, empty = plain list
     * @protected
     */
    protected _presetUnid: string = '';

    protected _sightingDialog: SightingEditModal;
    protected _sightingDeletedDialog: SightingDeletedModal;
    protected _map: SightingMap|null = null;

    /**
     * Sightings on the map by unid, so the popover actions (serialised HTML)
     * can find their entry again.
     * @protected
     */
    protected _mapEntries: Map<string, SightingsEntry> = new Map<string, SightingsEntry>();

    /**
     * @param {string} [presetUnid] saved list filter to apply
     */
    public constructor(presetUnid?: string) {
        super();

        if (presetUnid !== undefined && presetUnid !== '') {
            this._presetUnid = presetUnid;
            this._name = Sighting.presetPageName(presetUnid);
        }

        this._sightingDialog = new SightingEditModal();

        this._sightingDeletedDialog = new SightingDeletedModal();

        this._sightingDialog.setOnSave(async(): Promise<void> => {
            const sid = this._sightingDialog.getSightingId();

            /*
             * Add-flow is not wired yet — the modal doesn't capture tour_id/unid/etc.
             * needed for an INSERT, so the backend save endpoint is update-only.
             */
            if (sid === null) {
                this._toast.fire({icon: 'error', title: Lang.i().l('Creating new sightings via this dialog is not supported yet.')});
                return;
            }

            try {
                const ok = await SightingsAPI.save({
                    id: sid,
                    vehicle_id: this._sightingDialog.getVehicle(),
                    vehicle_driver_id: this._sightingDialog.getVehicleDriver(),
                    beaufort_wind: this._sightingDialog.getBeaufortWind(),
                    date: this._sightingDialog.getDateSight(),
                    tour_start: this._sightingDialog.getTourStart(),
                    tour_end: this._sightingDialog.getTourEnd(),
                    duration_from: this._sightingDialog.getDurationFrom(),
                    duration_until: this._sightingDialog.getDurationUntil(),
                    location_begin: this._sightingDialog.getPositionBegin(),
                    location_end: this._sightingDialog.getPositionEnd(),
                    species_id: this._sightingDialog.getSpecie(),
                    species_count: this._sightingDialog.getSpeciesCount(),
                    reaction_id: this._sightingDialog.getReaction(),
                    other: this._sightingDialog.getOther(),
                    other_vehicle: this._sightingDialog.getOtherBoats(),
                    note: this._sightingDialog.getNote()
                });

                if (ok) {
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }
                    this._toast.fire({icon: 'success', title: Lang.i().l('Sighting saved.')});
                    this._sightingDialog.hide();
                } else {
                    this._toast.fire({icon: 'error', title: Lang.i().l('Sighting save failed.')});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        this._sightingDeletedDialog.setOnSave(async(): Promise<void> => {
            const tid = this._sightingDeletedDialog.getSightingId();

            if (tid === null) {
                this._toast.fire({icon: 'error', title: Lang.i().l('ID is not set!')});
                this._sightingDeletedDialog.hide();
                return;
            }

            try {
                if (await SightingsAPI.delete({
                    id: tid,
                    description: this._sightingDeletedDialog.getDescription()
                })) {
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({icon: 'success', title: Lang.i().l('Sighting delete success.')});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }

            this._sightingDeletedDialog.hide();
        });
    }

    /**
     * Side menu / page name of a saved preset
     * @param {string} presetUnid
     * @returns {string}
     */
    public static presetPageName(presetUnid: string): string {
        return `sighting-filter-${presetUnid}`;
    }

    /**
     * Page class opening the list with a saved preset — the side menu
     * instantiates its entries without arguments.
     * @param {string} presetUnid
     * @returns {Function}
     */
    public static presetPage(presetUnid: string): new () => Sighting {
        return class extends Sighting {

            public constructor() {
                super(presetUnid);
            }

        };
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add sighting', 'fas fa-plus', () => {
            this._sightingDialog.setTitle(new LangTextV2({text: 'Add new sighting'}));
            this._sightingDialog.resetValues();
            this._sightingDialog.show();
        });

        // shared mutable state across loaders / renderers ----------------------------------------
        const sort: SortState = {
            id: SortOrder2.NONE,
            tour_id: SortOrder2.NONE,
            date: SortOrder2.DESC,
            tour_start: SortOrder2.DESC,
            create_datetime: SortOrder2.NONE,
            update_datetime: SortOrder2.NONE
        };

        const filterValues: SightingFilterValues = SightingTableFilter.emptyValues();

        /*
         * Period mode of the active filter (relative modes stay relative when
         * the filter is saved again) — the resolved dates live in filterValues.
         */
        let periodMode = '';

        let inHeaderSearch = '';
        let totalCount = 0;

        /*
         * Bumped on every fresh first page (filter / sort change) — background
         * loads of an older generation drop their results.
         */
        let dataGeneration = 0;
        let activeTab: 'list' | 'map' | 'analytics' | 'other' = 'list';
        /*
         * Mirrors what's been streamed onto the map; fed into the crossfilter dashboard
         * and re-used to redraw the map when the dashboard filters change.
         */
        const loadedEntries: SightingsEntry[] = [];
        const loadedIds = new Set<number>();

        /*
         * The search highlight should match anything currently filtering the result —
         * either the in-header quick-search or the modal's "search" field.
         */
        const activeHighlight = (): string => inHeaderSearch === '' ? filterValues.search : inHeaderSearch;

        // Build the filter payload sent to the backend; drop the empty fields.
        const buildApiFilter = (offset: number, limit: number): SightingsFilter => {
            const apiFilter: SightingsFilter = {
                order: {
                    id: sort.id,
                    tour_id: sort.tour_id,
                    date: sort.date,
                    tour_start: sort.tour_start,
                    create_datetime: sort.create_datetime,
                    update_datetime: sort.update_datetime
                },
                limit,
                offset
            };

            if (filterValues.period_from !== '') {
                apiFilter.period_from = filterValues.period_from;
            }
            if (filterValues.period_to !== '') {
                apiFilter.period_to = filterValues.period_to;
            }
            if (filterValues.species_id > 0) {
                apiFilter.species_id = filterValues.species_id;
            }
            if (filterValues.organization_id > 0) {
                apiFilter.organization_id = filterValues.organization_id;
            }
            if (filterValues.vehicle_id > 0) {
                apiFilter.vehicle_id = filterValues.vehicle_id;
            }
            if (filterValues.vehicle_driver_id > 0) {
                apiFilter.vehicle_driver_id = filterValues.vehicle_driver_id;
            }

            /*
             * The in-header quick-search wins over the modal's search when both are set;
             * it's the more "active" UI signal.
             */
            const search = inHeaderSearch === '' ? filterValues.search : inHeaderSearch;
            if (search !== '') {
                apiFilter.search = search;
            }

            if (filterValues.include_old) {
                apiFilter.include_old = true;
            }

            return apiFilter;
        };

        const content = this._wrapper.getContentWrapper().getContent();

        // Options of the filter dialog (filled by the lookup loads below)
        const speciesOptions: SelectOption2[] = [];
        const organizationOptions: SelectOption2[] = [];
        const vehicleOptions: SelectOption2[] = [];
        const driverOptions: SelectOption2[] = [];

        // Lookup maps + initial loads -----------------------------------------------------------
        const mspecies = new Map<number, SpeciesEntry>();
        const mvehicles = new Map<number, VehicleEntry>();
        const mdrivers = new Map<number, VehicleDriverEntry>();
        const mbehaviours = new Map<number, BehaviouralStateEntry>();
        const mencates = new Map<number, EncounterCategorieEntry>();
        const morganizations = new Map<number, OrganizationEntry>();

        /*
         * Bundle passed to _addSightingToMap so the map popover can resolve
         * vehicle/driver/organization names (filled by the loads below; the map
         * markers are only built afterwards, so the maps are populated by then).
         */
        const sightingLookups: SightingPopupLookups = {
            species: mspecies,
            vehicles: mvehicles,
            drivers: mdrivers,
            organizations: morganizations,
            behaviours: mbehaviours,
            encounterCategories: mencates
        };

        const [
            species,
            vehicles,
            drivers,
            behaviours,
            encates,
            organizations
        ] = await Promise.all([
            SpeciesAPI.getList(true),
            VehicleAPI.getList(true),
            VehicleDriverAPI.getList(true),
            BehaviouralStatesAPI.getList(true),
            EncounterCategoriesAPI.getList(true),
            OrganizationAPI.getOrganizationByUser(true)
        ]);

        if (species) {
            for (const s of species) {
                mspecies.set(s.id, s);
            }
            this._sightingDialog.setSpeciesList(species);
            speciesOptions.push(...species.map((e) => ({key: `${e.id}`, value: e.name})));
        }

        if (vehicles) {
            for (const v of vehicles) {
                mvehicles.set(v.id, v);
            }

            /*
             * Operational pickers (new sighting modal + top filter) only get
             * active boats. mvehicles above still holds every vehicle so old
             * rows referencing a retired boat keep rendering its name.
             */
            const activeVehicles = vehicles.filter((v) => v.in_use && !v.isdeleted);
            this._sightingDialog.setVehicleList(activeVehicles);
            vehicleOptions.push(...activeVehicles.map((e) => ({key: `${e.id}`, value: e.name})));
        }

        if (drivers) {
            for (const d of drivers) {
                mdrivers.set(d.id, d);
            }
            this._sightingDialog.setVehicleDriverList(drivers);
            driverOptions.push(...drivers.map((e) => ({key: `${e.id}`, value: e.user.name})));
        }

        if (behaviours) {
            for (const b of behaviours) {
                mbehaviours.set(b.id, b);
            }
        }

        if (encates) {
            for (const c of encates) {
                mencates.set(c.id, c);
            }
            this._sightingDialog.setReactionList(encates);
        }

        if (organizations) {
            for (const o of organizations) {
                morganizations.set(o.id, o);
            }
            organizationOptions.push(...organizations.map((e) => ({key: `${e.id}`, value: e.description})));
        }

        // Saved preset (side menu entry) overrides the defaults -------------------------------
        let preset: TableFilterEntry|null = null;

        if (this._presetUnid !== '') {
            try {
                const presets = await TableFilterAPI.getList(TABLE_FILTER_SIGHTING);
                preset = presets.find((entry) => entry.unid === this._presetUnid) ?? null;
            } catch (err) {
                this._toast.fire({icon: 'error', title: (err as Error).message});
            }
        }

        if (preset !== null) {
            const settings = SightingTableFilter.parse(preset.settings);

            if (settings !== null) {
                Object.assign(filterValues, SightingTableFilter.toFilterValues(settings, new Date()));
                periodMode = settings.period_mode ?? '';

                if (settings.sort_key) {
                    for (const key of SightingTableFilter.SORT_KEYS) {
                        sort[key] = SortOrder2.NONE;
                    }

                    sort[settings.sort_key as SortKey] = settings.sort_dir === 'asc' ? SortOrder2.ASC : SortOrder2.DESC;
                }
            }
        }

        /*
         * The filter dialog / preset menu are wired at the end of loadContent
         * (they need the table + sort headers); the early UI calls them via
         * these hooks.
         */
        let openFilterDialog = (): void => undefined;
        let openFilterMenu: (event: JQuery.ClickEvent) => void = (): void => undefined;

        // List card -----------------------------------------------------------------------------
        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());

        // Active filters are not visible in the table — name them next to the title.
        const filterHint = jQuery('<span class="ms-2 small text-muted fw-normal"/>');

        /*
         * Title = "Sighting[: <preset>] (<count>)" + active-filter hint. The
         * loader re-renders it with the count on every page fetch, so the hint
         * span is re-attached each time.
         */
        const renderTitle = (count?: number): void => {
            let title = Lang.i().l('Sighting') ?? 'Sighting';

            if (preset !== null) {
                title += `: ${preset.name}`;
            }

            if (count !== undefined) {
                title += ` (${count})`;
            }

            card.setTitle(jQuery('<span/>').text(title));
            filterHint.appendTo(card.getTitleElement());
        };

        renderTitle();

        const lang = Lang.i();

        /*
         * Toolbar above the tabs. The quick filters drive the same filter
         * state as the filter dialog (and saved presets), so List, Map,
         * Analytics and Export all follow them; `applyQuick` is wired once the
         * dialog helpers exist further down.
         */
        let applyQuick: ((mutate: (values: TableFilterModalValues) => void) => void) | null = null;

        const toolbar = AdminListUi.toolbar(card.getElement());
        toolbar.addClass('pb-3');

        AdminListUi.search(toolbar, 'search note / recognizable …', (term): void => {
            inHeaderSearch = term;
            this._onLoadTable?.();
        });

        const periodSelect = AdminListUi.select(toolbar, 'Whole period', (value): void => {
            if (value === 'absolute') {
                return;
            }

            applyQuick?.((values) => {
                values.periodMode = value === '0' ? '' : value;
                values.periodFrom = '';
                values.periodTo = '';
            });
        });

        AdminListUi.setOptions(periodSelect, [
            {value: 'current_year', label: lang.l('Current year')},
            {value: 'last_year', label: lang.l('Last year')},
            {value: 'last_30_days', label: lang.l('Last 30 days')},
            {value: 'last_90_days', label: lang.l('Last 90 days')},
            {value: 'last_365_days', label: lang.l('Last 365 days')}
        ]);

        const quickSelect = (allLabel: string, key: string, options: SelectOption2[]): JQuery<HTMLSelectElement> => {
            const select = AdminListUi.select(toolbar, allLabel, (value): void => {
                applyQuick?.((values) => {
                    values.selects[key] = value === '0' ? '' : value;
                });
            });

            AdminListUi.setOptions(select, options.map((o) => ({value: o.key, label: o.value})));
            return select;
        };

        const speciesSelect = quickSelect('All species', 'species', speciesOptions);
        const organizationSelect = quickSelect('All organizations', 'organization', organizationOptions);
        const vehicleSelect = quickSelect('All vehicles', 'vehicle', vehicleOptions);

        const oldSwitch = AdminListUi.switch(toolbar, `mwpa-sighting-include-old-${Date.now()}`, 'Show old data', (checked): void => {
            applyQuick?.((values) => {
                values.toggles.include_old = checked;
            });
        });

        const btnFilter = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary"/>').appendTo(toolbar);
        jQuery('<i class="fas fa-sliders-h me-1"/>').appendTo(btnFilter);
        jQuery('<span/>').text(lang.l('More filters …')).appendTo(btnFilter);
        btnFilter.on('click', (event): void => openFilterMenu(event));

        const resultInfo = AdminListUi.resultInfo(toolbar);

        // toolbar <- filter state (after the dialog, a preset or a quick filter)
        const syncToolbar = (): void => {
            periodSelect.find('option[value="absolute"]').remove();

            if (periodMode === 'absolute') {
                jQuery('<option value="absolute"/>')
                .text(`${filterValues.period_from || '…'} – ${filterValues.period_to || '…'}`)
                .appendTo(periodSelect);
            }

            periodSelect.val(periodMode === '' ? '0' : periodMode);

            const setSelect = (select: JQuery<HTMLSelectElement>, id: number): void => {
                const value = id > 0 ? `${id}` : '0';

                if (select.find(`option[value="${value}"]`).length === 0) {
                    jQuery('<option/>').attr('value', value).text(`#${id}`).appendTo(select);
                }

                select.val(value);
            };

            setSelect(speciesSelect, filterValues.species_id);
            setSelect(organizationSelect, filterValues.organization_id);
            setSelect(vehicleSelect, filterValues.vehicle_id);
            oldSwitch.prop('checked', filterValues.include_old);
        };

        syncToolbar();

        /*
         * Map tab on top of the table — the existing layout has both views side-by-side via NavTab,
         * we keep the same UX. Build the navigation manually since we want full control over which
         * body the table goes into.
         */
        const navContainer = jQuery('<ul class="nav nav-tabs"/>').appendTo(card.getElement());
        const tabBodies = jQuery('<div class="tab-content"/>').appendTo(card.getElement());

        const listTabId = `sighting-tab-list-${Date.now()}`;
        const mapTabId = `sighting-tab-map-${Date.now()}`;
        const analyticsTabId = `sighting-tab-analytics-${Date.now()}`;
        const yearCompareTabId = `sighting-tab-year-${Date.now()}`;
        const exportTabId = `sighting-tab-export-${Date.now()}`;

        navContainer.append(`<li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#${listTabId}">${lang.l('List')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${mapTabId}" data-bs-toggle="tab">${lang.l('Map')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${analyticsTabId}" data-bs-toggle="tab">${lang.l('Analytics')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${yearCompareTabId}" data-bs-toggle="tab">${lang.l('Year comparison')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${exportTabId}" data-bs-toggle="tab">${lang.l('Export')}</a></li>`);

        const listBody = jQuery(`<div class="tab-pane fade active show" id="${listTabId}"/>`).appendTo(tabBodies);
        const mapBody = jQuery(`<div class="tab-pane fade" id="${mapTabId}"/>`).appendTo(tabBodies);
        const analyticsBody = jQuery(`<div class="tab-pane fade" id="${analyticsTabId}"/>`).appendTo(tabBodies);
        const yearCompareBody = jQuery(`<div class="tab-pane fade" id="${yearCompareTabId}"/>`).appendTo(tabBodies);
        const exportBody = jQuery(`<div class="tab-pane fade" id="${exportTabId}"/>`).appendTo(tabBodies);

        // Map tab: map with overlays (left) + crossfilter side panel (right), fed from `loadedEntries`
        const mapLayout = jQuery('<div class="mwpa-sighting-map"/>').appendTo(mapBody);
        const mapMain = jQuery('<div class="mwpa-sighting-map-main"/>').appendTo(mapLayout);
        const mapPanel = jQuery('<div class="mwpa-sighting-map-panel"/>').appendTo(mapLayout);
        const mapContainer = jQuery('<div/>').appendTo(mapMain);
        const dashboard = new SightingDashboard(mapPanel);

        // display mode + zoom to data (top left, next to the zoom buttons)
        const mapTools = jQuery('<div class="mwpa-map-overlay mwpa-map-overlay-tools d-flex gap-2"/>').appendTo(mapMain);
        const modeGroup = jQuery('<div class="btn-group btn-group-sm shadow-sm" role="group"/>').appendTo(mapTools);
        const displayModes: {mode: SightingMapDisplayMode; icon: string; label: string;}[] = [
            {mode: 'cluster', icon: 'far fa-dot-circle', label: 'Grouped'},
            {mode: 'points', icon: 'fas fa-map-marker-alt', label: 'Points'},
            {mode: 'heat', icon: 'fas fa-fire', label: 'Heatmap'}
        ];

        for (const displayMode of displayModes) {
            const btn = jQuery('<button type="button" class="btn"/>')
            .addClass(displayMode.mode === 'cluster' ? 'btn-primary' : 'btn-light')
            .attr('data-mode', displayMode.mode)
            .appendTo(modeGroup);
            jQuery('<i class="me-1"/>').addClass(displayMode.icon).appendTo(btn);
            jQuery('<span/>').text(lang.l(displayMode.label)).appendTo(btn);

            btn.on('click', (): void => {
                modeGroup.find('button').removeClass('btn-primary').addClass('btn-light');
                btn.removeClass('btn-light').addClass('btn-primary');
                this._map?.setDisplayMode(displayMode.mode);
            });
        }

        const btnFit = jQuery('<button type="button" class="btn btn-light btn-sm shadow-sm"/>')
        .attr('title', lang.l('Zoom to the sightings'))
        .appendTo(mapTools);
        jQuery('<i class="fas fa-expand-arrows-alt"/>').appendTo(btnFit);
        btnFit.on('click', (): void => {
            this._map?.fitToData();
        });

        // legend of the bubble colours (bottom left)
        const legend = jQuery('<div class="mwpa-map-overlay shadow-sm bg-body rounded px-2 py-1 small d-flex flex-wrap gap-3"/>')
        .css({bottom: '0.75rem', left: '0.75rem'})
        .appendTo(mapMain);

        for (const [color, label] of [['#2f6fb5', 'Toothed whales'], ['#2e8b57', 'Baleen whales'], ['#c47f17', 'Sea turtles']]) {
            const item = jQuery('<span class="d-inline-flex align-items-center gap-1"/>').appendTo(legend);
            jQuery('<span class="rounded-circle d-inline-block"/>').css({width: '10px', height: '10px', background: color}).appendTo(item);
            jQuery('<span/>').text(lang.l(label)).appendTo(item);
        }

        // loading chip (top centre) — progress of the background load + cancel / resume
        const loadChip = jQuery('<div class="mwpa-map-overlay mwpa-map-overlay-top shadow bg-body rounded-pill px-3 py-2 small d-flex align-items-center gap-2 d-none"/>')
        .appendTo(mapMain);
        const loadSpinner = jQuery('<span class="spinner-border spinner-border-sm text-primary"/>').appendTo(loadChip);
        const loadText = jQuery('<span class="text-nowrap"/>').appendTo(loadChip);
        const loadProgress = jQuery('<div class="progress" style="width:110px;height:6px;"/>').appendTo(loadChip);
        const loadBar = jQuery('<div class="progress-bar"/>').appendTo(loadProgress);
        const btnLoadCancel = jQuery('<button type="button" class="btn btn-link btn-sm p-0 text-nowrap"/>')
        .text(lang.l('Cancel'))
        .appendTo(loadChip);
        const btnLoadResume = jQuery('<button type="button" class="btn btn-link btn-sm p-0 text-nowrap"/>')
        .text(lang.l('Load the rest'))
        .appendTo(loadChip);

        /*
         * Add sightings to `loadedEntries` + the map, skipping ones already
         * there (list pages and the background load can overlap).
         */
        const pushLoaded = (list: SightingsEntry[]): SightingsEntry[] => {
            const added: SightingsEntry[] = [];

            for (const entry of list) {
                if (!loadedIds.has(entry.id)) {
                    loadedIds.add(entry.id);
                    loadedEntries.push(entry);
                    added.push(entry);
                    this._addSightingToMap(entry, sightingLookups);
                }
            }

            return added;
        };

        /*
         * Redraw the map against whatever survived the dashboard's filters. The full
         * `loadedEntries` stay in the crossfilter — only what's shown on the map shrinks.
         */
        const redrawMap = async(filtered: SightingsEntry[]): Promise<void> => {
            if (!this._map) {
                return;
            }

            this._map.clearFeatureList();

            for (const entry of filtered) {
                this._addSightingToMap(entry, sightingLookups);
            }

            /*
             * Refresh the movements layer with the filtered set — but
             * only if the user has opened it. Otherwise we keep the
             * fetch deferred.
             */
            // eslint-disable-next-line no-use-before-define
            await refreshMovementsForEntries(filtered);

            await this._map.refrech();
        };

        /**
         * Chunked fetch + append. Keeps the browser responsive when the
         * filtered set is large — without this, a 5000-sighting filter
         * crashes the UI thread during GeoJSON parse + OL feature
         * insertion. 100 ids per request is enough to keep DB round-trips
         * low without producing megabytes per response.
         */
        const MOVEMENT_CHUNK_SIZE = 100;

        /**
         * A monotonically increasing sequence the chunked-load flow uses
         * as a race-guard: if the user toggles the layer or changes the
         * dashboard filter mid-load, every in-flight chunk that doesn't
         * match the current sequence number gets dropped on arrival.
         */
        let movementFetchSeq = 0;

        const sleepZero = (): Promise<void> => new Promise<void>((resolve) => {
            /*
             * Yield to the event loop between chunks so the page stays
             * interactive (scroll, layer toggle, etc.). setTimeout(0) is
             * good enough — we don't need a frame-aligned yield.
             */
            setTimeout(resolve, 0);
        });

        /**
         * Wipe the movements layer and re-populate it for `entries`
         * incrementally. The page calls this on layer toggle-on, on
         * dashboard filter change, and after a "load all" backfill. Each
         * chunk's features get appended as soon as they arrive so the
         * user sees tracks growing on the map instead of waiting for the
         * whole set.
         */
        const refreshMovementsForEntries = async(entries: SightingsEntry[]): Promise<void> => {
            if (!this._map || !this._map.isMovementsLayerVisible()) {
                return;
            }

            const seq = ++movementFetchSeq;
            this._map.clearMovementTracks();

            const ids = entries.map((e) => e.id);
            for (let i = 0; i < ids.length; i += MOVEMENT_CHUNK_SIZE) {
                const chunk = ids.slice(i, i + MOVEMENT_CHUNK_SIZE);

                try {
                    // eslint-disable-next-line no-await-in-loop
                    const movements = await SightingMovementAPI.getList(chunk);

                    if (seq !== movementFetchSeq) {
                        /*
                         * A newer refresh started while this chunk was in
                         * flight — drop the result, the newer flow will
                         * repopulate everything from scratch.
                         */
                        return;
                    }

                    if (this._map) {
                        this._map.setMovementTracks(movements, true);
                    }
                } catch (err) {
                    console.warn('[Sighting] movement fetch failed', err);
                }

                // eslint-disable-next-line no-await-in-loop
                await sleepZero();
            }
        };

        /**
         * Append movements for a single new page of sightings (no clear).
         * Cheaper than `refreshMovementsForEntries` during infinite
         * scroll: we know the prior chunks are still valid, just need
         * tracks for the rows the user just brought in.
         */
        const appendMovementsForEntries = async(entries: SightingsEntry[]): Promise<void> => {
            if (!this._map || !this._map.isMovementsLayerVisible()) {
                return;
            }
            if (entries.length === 0) {
                return;
            }

            const seq = movementFetchSeq;

            try {
                const movements = await SightingMovementAPI.getList(entries.map((e) => e.id));

                if (seq !== movementFetchSeq) {
                    return;
                }

                if (this._map) {
                    this._map.setMovementTracks(movements, true);
                }
            } catch (err) {
                console.warn('[Sighting] movement append failed', err);
            }
        };

        dashboard.setLookups({species: mspecies, vehicles: mvehicles});
        dashboard.setOnFiltered((filtered) => {
            redrawMap(filtered).catch(() => undefined);
        });

        // Analytics tab (d3 charts on the same loadedEntries) -----------------------------------
        const analytics = new SightingAnalytics(analyticsBody);
        analytics.setLookups(sightingLookups);

        // Year-comparison tab (loads its own dataset, ignoring period filter) -------------------
        const yearCompare = new SightingYearCompare(yearCompareBody);
        let yearCompareLoaded = false;

        /*
         * Both Map and Analytics tabs work off `loadedEntries`. The list streams it page-by-page,
         * so on first tab-open we usually need to backfill the rest under the active filter.
         * Shared helper so Map and Analytics behave identically.
         */
        let dashboardKey = '';

        const refreshDataDashboards = (): void => {
            const key = `${dataGeneration}:${loadedEntries.length}`;

            // unchanged data — keep the user's chart selection
            if (key === dashboardKey) {
                return;
            }

            dashboardKey = key;
            dashboard.setData(loadedEntries);
            analytics.setData(loadedEntries);
            this._map?.updateProtectedAreaCounts();

            /*
             * The dashboard just grew to its data-filled height, which changes
             * where the map below it starts — re-fit the map to the viewport.
             * Deferred a frame so the dashboard layout has settled before we
             * measure (otherwise the map would be sized against the empty,
             * short dashboard and overshoot the viewport bottom).
             */
            if (this._map) {
                window.requestAnimationFrame(() => {
                    if (!this._map) {
                        return;
                    }

                    // eslint-disable-next-line no-use-before-define
                    applyMapHeight();
                });
            }
        };

        /*
         * Map / Analytics need every sighting under the filter, the list only
         * streams 30 at a time. The rest loads in the background in chunks
         * (markers appear while it runs); a chip on the map shows the progress
         * and can cancel / resume. No confirmation dialog.
         */
        const BACKFILL_CHUNK = 2500;
        let backfill: Promise<void> | null = null;
        let backfillCancelled = false;

        const updateLoadInfo = (): void => {
            const loaded = loadedEntries.length;
            const running = backfill !== null && !backfillCancelled;
            const partial = loaded < totalCount;
            const onDataTab = activeTab === 'map' || activeTab === 'analytics';

            resultInfo.text(`${loaded.toLocaleString()} ${lang.l('of')} ${totalCount.toLocaleString()} ${lang.l('loaded')}`);

            loadChip.toggleClass('d-none', !(running || (partial && onDataTab && totalCount > 0)));
            loadSpinner.toggleClass('d-none', !running);
            loadProgress.toggleClass('d-none', !running);
            btnLoadCancel.toggleClass('d-none', !running);
            btnLoadResume.toggleClass('d-none', running);
            loadBar.css('width', `${totalCount > 0 ? Math.round((loaded / totalCount) * 100) : 0}%`);
            loadText.text(running
                ? `${lang.l('Loading sightings …')} ${loaded.toLocaleString()} / ${totalCount.toLocaleString()}`
                : `${loaded.toLocaleString()} ${lang.l('of')} ${totalCount.toLocaleString()} ${lang.l('sightings on the map')}`);
        };

        const loadRemaining = (): Promise<void> => {
            if (backfill !== null) {
                return backfill;
            }

            if (loadedEntries.length >= totalCount) {
                refreshDataDashboards();
                updateLoadInfo();
                return Promise.resolve();
            }

            const generation = dataGeneration;
            backfillCancelled = false;

            const shouldContinue = (): boolean => !backfillCancelled
                && generation === dataGeneration
                && loadedEntries.length < totalCount;

            backfill = (async(): Promise<void> => {
                try {
                    while (shouldContinue()) {
                        updateLoadInfo();

                        const offset = loadedEntries.length;
                        // eslint-disable-next-line no-await-in-loop
                        const more = await SightingsAPI.getList(buildApiFilter(offset, Math.min(BACKFILL_CHUNK, totalCount - offset)));

                        if (generation !== dataGeneration || !more || more.list.length === 0) {
                            break;
                        }

                        const added = pushLoaded(more.list);

                        /*
                         * Tracks only for the new ones (skips silently while the
                         * movements layer is hidden).
                         */
                        // eslint-disable-next-line no-await-in-loop
                        await appendMovementsForEntries(added);

                        if (this._map) {
                            // eslint-disable-next-line no-await-in-loop
                            await this._map.refrech();
                        }

                        // no progress (data changed under us) — stop instead of looping
                        if (added.length === 0) {
                            break;
                        }
                    }
                } catch (err) {
                    this._toast.fire({icon: 'error', title: (err as Error).message});
                } finally {
                    backfill = null;
                }

                if (generation === dataGeneration) {
                    refreshDataDashboards();
                }

                updateLoadInfo();
            })();

            updateLoadInfo();
            return backfill;
        };

        btnLoadCancel.on('click', (): void => {
            backfillCancelled = true;
            updateLoadInfo();
        });

        btnLoadResume.on('click', (): void => {
            loadRemaining().catch(() => undefined);
        });

        // Map ----------------------------------------------------------------------------------
        const currentuser = await UserAPI.getUserInfo();
        let viewCenter: Coordinate|null = null;

        if (currentuser?.organization) {
            viewCenter = fromLonLat([
                parseFloat(currentuser.organization.lon),
                parseFloat(currentuser.organization.lat)
            ]);
        }

        this._map = new SightingMap(mapContainer);

        /*
         * Fill the map down to the viewport bottom. Measure the map container's
         * own top offset (below the filter, tabs and the dashboard that sits
         * above it) and subtract it from the viewport height — this adapts to
         * whatever chrome the shell has (the AdminLTE 4 flip hides the page-title
         * header, so the old fixed `window.height() - 220 - 320` offset left a
         * large empty gap under the map). While the Map tab is still hidden the
         * container has no layout (top ≈ 0), so fall back to a window estimate
         * for the first (invisible) render; `shown.bs.tab` recomputes it.
         */
        const computeMapHeight = (): number => {
            const top = mapContainer[0]?.getBoundingClientRect().top ?? 0;

            if (top <= 0) {
                return Math.max(420, window.innerHeight - 260);
            }

            return Math.max(420, window.innerHeight - top - 24);
        };

        // map + side panel share the height
        const applyMapHeight = (): void => {
            const height = computeMapHeight();
            mapPanel.css('max-height', `${height}px`);

            if (this._map) {
                this._map.setHeight(height);
                this._map.updateSize();
            }
        };

        applyMapHeight();

        this._map.load({
            useHeatmap: true,
            useBathymetriemap: true,
            useCluster: true,
            useLayerPanel: true
        });

        this._map.setDisplayMode('cluster');

        this._map.setView(viewCenter);

        /*
         * Protected areas (Natura 2000) around the organization's home area —
         * the backend loads them from the EEA on first request ("pending"),
         * so ask again every 15 s for a few minutes until they are there.
         */
        const loadProtectedAreas = async(attempt: number): Promise<void> => {
            if (!this._map || !mapContainer[0]?.isConnected) {
                return;
            }

            let data: ProtectedAreaData | null = null;

            try {
                data = await ProtectedAreaAPI.get();
            } catch {
                data = null;
            }

            if (!this._map || data === null) {
                return;
            }

            switch (data.status) {
                case 'ok':
                    this._map.setProtectedAreas(
                        data.geojson ?? '{"type":"FeatureCollection","features":[]}',
                        `${data.feature_count} ${lang.l('areas')} · ${data.source} · ${lang.l('as of')} ${moment(data.fetch_datetime * 1000).format('YYYY.MM.DD')}`
                    );
                    break;

                case 'pending':
                    this._map.setProtectedAreaStatus(lang.l('Loading the protected areas of your region …'));

                    if (attempt < 20) {
                        setTimeout((): void => {
                            loadProtectedAreas(attempt + 1).catch(() => undefined);
                        }, 15000);
                    }
                    break;

                case 'no_area':
                    this._map.setProtectedAreaStatus(lang.l('Your organization has no home area or position — no protected areas.'));
                    break;

                default:
                    this._map.setProtectedAreaStatus(lang.l('The protected areas could not be loaded (EEA service). Next attempt in a few hours.'));
            }
        };

        loadProtectedAreas(0).catch(() => undefined);

        /*
         * Lazy-fetch movements only when the user opens the layer in
         * the LayerSwitcher. Visibility changes also fire when the layer
         * gets unchecked — we drop the source content in that case so
         * turning it back on always re-fetches the current visible set.
         */
        this._map.setOnMovementsVisibilityChange((visible) => {
            if (!this._map) {
                return;
            }

            if (!visible) {
                this._map.clearMovementTracks();
                return;
            }

            refreshMovementsForEntries(loadedEntries).catch(() => undefined);
        });

        navContainer.find(`a[href="#${mapTabId}"]`).on('shown.bs.tab', () => {
            if (!this._map) {
                return;
            }

            /*
             * Defer to the next frame: `shown.bs.tab` fires before the now-
             * visible dashboard above the map has settled its layout, so
             * measuring the map container's top offset immediately yields a
             * too-small value (map ends up too tall, overshooting the viewport).
             */
            window.requestAnimationFrame(() => {
                if (!this._map) {
                    return;
                }

                applyMapHeight();
            });

            loadRemaining().catch(() => undefined);
        });

        navContainer.find(`a[href="#${analyticsTabId}"]`).on('shown.bs.tab', () => {
            /*
             * The analytics charts are first drawn at load while this tab is
             * hidden (width 0 → fallback width). Re-render now that the tab is
             * visible so the D3 charts size to the real container width. Deferred
             * a frame so the pane layout has settled.
             */
            window.requestAnimationFrame(() => {
                analytics.setData(loadedEntries);
            });

            loadRemaining().catch(() => undefined);
        });

        /*
         * Year-on-year comparison ignores period_from/period_to (the whole point is to span
         * multiple years), but keeps every other filter so org/species/vehicle scoping still
         * applies. Loaded once per page-render and cached — re-run by reloading the page.
         */
        const loadYearCompareIfNeeded = async(): Promise<void> => {
            if (yearCompareLoaded) {
                return;
            }
            yearCompareLoaded = true;

            const f = buildApiFilter(0, 100000);
            delete f.period_from;
            delete f.period_to;

            yearCompare.setData([]);
            const response = await SightingsAPI.getList(f);
            if (response) {
                yearCompare.setData(response.list);
            }
        };

        navContainer.find('a').on('shown.bs.tab', (event): void => {
            const href = jQuery(event.target).attr('href');

            if (href === `#${mapTabId}`) {
                activeTab = 'map';
            } else if (href === `#${analyticsTabId}`) {
                activeTab = 'analytics';
            } else if (href === `#${listTabId}`) {
                activeTab = 'list';
            } else {
                activeTab = 'other';
            }

            updateLoadInfo();
        });

        navContainer.find(`a[href="#${yearCompareTabId}"]`).on('shown.bs.tab', () => {
            loadYearCompareIfNeeded().catch(() => undefined);
        });

        /*
         * Backfill all sightings under the active filter without prompting (used by the PDF
         * orchestrator — analytics + dashboard need the full set, but the user already
         * committed to "Generate PDF" so we don't ask twice).
         */
        const ensureAllSightingsLoaded = async(): Promise<void> => {
            await loadRemaining();
            refreshDataDashboards();
        };

        /*
         * Export tab — three sub-tabs (Excel Export / Excel Report / Data Page).
         * The Data Page button hands off to the page-side `generatePdf` orchestrator
         * since the widget can't trigger map/analytics rendering itself.
         */
        const generatePdf = async(): Promise<void> => {
            await ensureAllSightingsLoaded();
            await loadYearCompareIfNeeded();

            const olMap = this._map;
            const $body = jQuery('body');

            /*
             * Make the panes visible on screen so D3 measures the right container width
             * and OL has a real canvas to draw into. The mwpa-print-mode CSS in
             * mwpa.css promotes any `.print-include` pane to display:block right away
             * (not just under @media print) — without this, the SVGs would already
             * have been drawn into a 0-width hidden container.
             */
            mapBody.addClass('print-include');
            analyticsBody.addClass('print-include');
            yearCompareBody.addClass('print-include');
            $body.addClass('mwpa-print-mode');

            /*
             * The panes are now visible. Let the layout settle one frame so jQuery
             * .width() reads the new sizes, then redraw the d3 charts so they fit
             * the actual on-screen width (not the 0 / 320-fallback they had while
             * hidden).
             */
            await new Promise((resolve) => {
                window.requestAnimationFrame(() => resolve(undefined));
            });

            analytics.setData(loadedEntries);
            /*
             * yearCompare already has its own data; re-set to force re-render at
             * the now-visible container width.
             * (loadYearCompareIfNeeded above only kicks off the network fetch.)
             * We don't store the year dataset on the page, so trigger via the
             * widget's own data: setData([]) then re-fetch would race; instead,
             * re-show via a fresh fetch only if the data wasn't there yet.
             * The simpler, deterministic move: force a re-render by passing the
             * same list back in. yearCompare keeps a reference internally on
             * first setData; without an accessor we re-fetch here.
             */
            const yearFilter = buildApiFilter(0, 100000);
            delete yearFilter.period_from;
            delete yearFilter.period_to;
            const yearResp = await SightingsAPI.getList(yearFilter);
            if (yearResp) {
                yearCompare.setData(yearResp.list);
            }

            /*
             * OL renders into the visible map container. After updating size it
             * requests new tiles asynchronously — wait for `rendercomplete` (with
             * a timeout fallback) so the print snapshot captures filled tiles.
             */
            if (olMap) {
                olMap.updateSize();
                await olMap.refrech();
                await new Promise<void>((resolve) => {
                    /*
                     * Cannot listen on the SightingMap wrapper directly without an
                     * accessor — refrech() schedules a re-render and tiles load via
                     * the OL source. The hard timeout is a sane upper bound.
                     */
                    window.setTimeout(resolve, 1500);
                });
            }

            const cleanup = (): void => {
                $body.removeClass('mwpa-print-mode');
                mapBody.removeClass('print-include');
                analyticsBody.removeClass('print-include');
                yearCompareBody.removeClass('print-include');
                window.removeEventListener('afterprint', cleanup);

                /*
                 * Re-set analytics width with normal layout so on-screen SVGs match
                 * the (now smaller) Bootstrap-tab container.
                 */
                analytics.setData(loadedEntries);

                /*
                 * Map's container is back to its dashboard-tab dimensions — let OL
                 * resize so the on-screen view stays correct.
                 */
                if (olMap) {
                    olMap.updateSize();
                }
            };
            window.addEventListener('afterprint', cleanup);

            try {
                window.print();
            } finally {
                // Belt-and-braces: some browsers don't fire afterprint reliably.
                window.setTimeout(cleanup, 1500);
            }
        };

        // eslint-disable-next-line no-new
        new SightingExport(
            exportBody,
            () => ({
                period_from: filterValues.period_from,
                period_to: filterValues.period_to,
                species_id: filterValues.species_id,
                organization_id: filterValues.organization_id,
                vehicle_id: filterValues.vehicle_id,
                vehicle_driver_id: filterValues.vehicle_driver_id,
                search: inHeaderSearch === '' ? filterValues.search : inHeaderSearch
            }),
            generatePdf
        );

        // Table ---------------------------------------------------------------------------------
        const tableWrapper = new TableWrapper2<SightingsEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(listBody);
        const emptyInfo = AdminListUi.emptyInfo(listBody, 'No sightings match the current filter.');
        const table = tableWrapper.getTable();
        table.getElement().addClass('table-hover align-middle mb-0');
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        /*
         * Sort registry: each call wires a header to its key in `sort` and ensures clicking it
         * resets every other header (single-column sort).
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

        const thPicture = new Th2({value: ''});
        thPicture.appendTo(trhead);
        thPicture.getElement().css('width', '60px');

        const thSighting = new Th2({});
        thSighting.addComponent(new LangTextV2({text: 'Species'}));
        thSighting.append('<span class="text-body-tertiary fw-normal"> · </span>');
        thSighting.addComponent(makeSortColumn('Id', 'id'));
        thSighting.appendTo(trhead);

        const thDate = new Th2({});
        thDate.addComponent(makeSortColumn('Date', 'date'));
        thDate.append('<span class="text-body-tertiary fw-normal"> · </span>');
        thDate.addComponent(makeSortColumn('Time begin-end', 'tour_start'));
        thDate.appendTo(trhead);

        const thTour = new Th2({});
        thTour.addComponent(new LangTextV2({text: 'Vehicle'}));
        thTour.append('<span class="text-body-tertiary fw-normal"> · </span>');
        thTour.addComponent(makeSortColumn('Tour', 'tour_id'));
        thTour.appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Group-Size'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Location'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Behaviour'})}).appendTo(trhead);

        const thCreated = new Th2({});
        thCreated.addComponent(makeSortColumn('Created', 'create_datetime'));
        thCreated.append('<span class="text-body-tertiary fw-normal"> · </span>');
        thCreated.addComponent(makeSortColumn('Updated', 'update_datetime'));
        thCreated.appendTo(trhead);

        new Th2({value: ''}).appendTo(trhead);

        // Edit dialog ---------------------------------------------------------------------------
        const openEdit = (entry: SightingsEntry): void => {
            const distanceCoast = parseFloat(entry.distance_coast!) || 0;

            this._sightingDialog.setTitle(Lang.i().l('Edit Sighting'));
            this._sightingDialog.resetValues();
            this._sightingDialog.setSightingId(entry.id);
            this._sightingDialog.setTourId(entry.tour_id);
            this._sightingDialog.setVehicle(entry.vehicle_id!);
            this._sightingDialog.setVehicleDriver(entry.vehicle_driver_id!);
            this._sightingDialog.setBeaufortWind(entry.beaufort_wind!);
            this._sightingDialog.setDateSight(entry.date!);
            this._sightingDialog.setTourStart(entry.tour_start!);
            this._sightingDialog.setTourEnd(entry.tour_end!);
            this._sightingDialog.setDurationFrom(entry.duration_from!);
            this._sightingDialog.setDurationUntil(entry.duration_until!);
            this._sightingDialog.setPositionBegin(entry.location_begin!);
            this._sightingDialog.setPositionEnd(entry.location_end!);
            this._sightingDialog.setDistanceCoast(UtilDistanceCoast.meterToM(distanceCoast, true));
            this._sightingDialog.setSpecie(entry.species_id!);
            this._sightingDialog.setSpeciesCount(entry.species_count!);
            this._sightingDialog.setReaction(entry.reaction_id!);
            this._sightingDialog.setOther(entry.other!);
            this._sightingDialog.setOtherBoats(entry.other_vehicle!);
            this._sightingDialog.setNote(entry.note!);
            this._sightingDialog.show();
        };

        /*
         * Per-vessel GFW breakdown — a small modal listing each fishing vessel
         * that was active in the 25 km buffer on the sighting day. An empty
         * list shows a placeholder so "no activity" differs from "failed".
         */
        const showFishingVessels = async(entry: SightingsEntry): Promise<void> => {
            let vessels: SightingFishingVesselEntry[] = [];

            try {
                vessels = await SightingFishingVesselAPI.getList([entry.id]);
            } catch (e) {
                this._toast.fire({icon: 'error', title: (e as Error).message});
                return;
            }

            const esc = (s: string): string => AdminListUi.escape(s);
            const body = jQuery('<div/>');

            if (vessels.length === 0) {
                body.html('<p class="text-muted">No fishing vessels recorded for this sighting (no activity, or GFW pull hasn\'t run yet).</p>');
            } else {
                const lines: string[] = ['<table class="table table-sm table-striped">'];
                lines.push('<thead><tr><th>Vessel</th><th>Flag</th><th>Gear</th><th class="text-end">Hours</th></tr></thead><tbody>');

                for (const v of vessels) {
                    const name = v.name && v.name !== '' ? esc(v.name) : `<code class="small">${esc(v.vessel_id)}</code>`;
                    const mmsi = v.mmsi && v.mmsi !== '' ? `<br><small class="text-muted">MMSI ${esc(v.mmsi)}</small>` : '';
                    lines.push('<tr>'
                        + `<td>${name}${mmsi}</td>`
                        + `<td>${esc(v.flag ?? '—')}</td>`
                        + `<td>${esc(v.gear_type ?? '—')}</td>`
                        + `<td class="text-end">${v.hours.toFixed(2)}</td>`
                        + '</tr>');
                }

                lines.push('</tbody></table>');
                body.html(lines.join(''));
            }

            DialogInfo2.info(
                'fishingvessels',
                ModalDialogType2.large,
                `Fishing vessels — Sighting #${entry.id}`,
                body,
                (_, modal) => modal.hide()
            );
        };

        const showImage = (entry: SightingsEntry, fname: string): void => {
            const aImage = jQuery<HTMLImageElement>('<img alt="" style="width:100%;"/>')
            .attr('src', `/json/sightings/getimage/${entry.id}/${encodeURIComponent(fname)}`);

            DialogInfo2.info(
                'sightimage',
                ModalDialogType2.xlarge,
                `Image for Sighting #${entry.id}`,
                aImage,
                (_, modal) => modal.hide()
            );
        };

        // Map popover actions (see _buildSightingPopupActions) ------------------------------------
        this._map?.setOnPopupAction((action, unid) => {
            const entry = this._mapEntries.get(unid);

            if (!entry) {
                return;
            }

            switch (action) {
                case 'open':
                    openEdit(entry);
                    break;

                case 'tour':
                    Nav.load(new ToursMap(entry.tour_id)).then();
                    break;

                case 'zoom':
                    this._zoomToSighting(entry);
                    break;

                case 'species':
                    if (entry.species_id) {
                        Nav.load(new SpeciesProfilePage(entry.species_id)).then();
                    }
                    break;

                case 'photo':
                    if (entry.files.length > 0) {
                        showImage(entry, entry.files[0]);
                    }
                    break;

                case 'fishing':
                    showFishingVessels(entry).catch(() => undefined);
                    break;

                default:
            }
        });

        const subline = (parent: JQuery, icon: string, html: string, title?: string): JQuery => {
            const line = jQuery('<div class="small text-body-secondary text-nowrap"/>').appendTo(parent);
            jQuery('<i class="fa-fw me-1 opacity-75"/>').addClass(icon).appendTo(line);
            const span = jQuery('<span/>').html(html).appendTo(line);

            if (title) {
                line.attr('title', Lang.i().l(title));
            }

            return span;
        };

        // Renderer ------------------------------------------------------------------------------
        const renderRow = (_table: Table2, entry: SightingsEntry): void => {
            const esc = (s: string): string => AdminListUi.escape(s);
            const term = activeHighlight();
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            /* Historical hand-maintained rows (sighting_old): muted + "ALT" pill, read-only. */
            if (entry.is_old) {
                tr.getElement().addClass('mwpa-old-row table-secondary');
            }

            const specie = entry.species_id ? mspecies.get(entry.species_id) : undefined;

            // picture
            const tdPicture = new Td2({value: ''});
            tdPicture.appendTo(tr);
            tdPicture.getElement()[0]?.insertAdjacentHTML(
                'beforeend',
                UtilSpeciesSilhouette.img(specie?.name ?? entry.other ?? '', 44, SpeciesAPI.imageUrl(specie))
            );

            // species + id + other species + note hit
            const tdSighting = new Td2({value: ''});
            tdSighting.appendTo(tr);
            // eslint-disable-next-line no-new
            new SpeciesDisplay(tdSighting.getElement(), entry, mspecies, (speciesId) => {
                Nav.load(new SpeciesProfilePage(speciesId)).then();
            });

            const idLine = jQuery('<div class="small mt-1 d-flex flex-wrap align-items-center gap-1"/>').appendTo(tdSighting.getElement());
            jQuery('<span class="font-monospace text-body-secondary"/>').text(`#${entry.id}`).appendTo(idLine);

            if (entry.is_old) {
                AdminListUi.pill(idLine, 'OLD', 'warning', 'fas fa-archive')
                .attr('title', lang.l('Old data – entered by hand, read-only'));
            }

            const otherSpecies = SightingPopup.parseIdMapNames(
                entry.other_species ?? '',
                (id) => mspecies.get(id)?.name.split(',')[0]
            );

            if (otherSpecies.length > 0) {
                subline(tdSighting.getElement(), 'fas fa-plus', esc(otherSpecies.join(', ')), 'Other species');
            }

            const note = (entry.note ?? '').trim();

            if (note !== '') {
                const noteLine = jQuery('<div class="small fst-italic text-body-secondary text-truncate" style="max-width:260px;"/>')
                .attr('title', note)
                .appendTo(tdSighting.getElement());
                jQuery('<i class="far fa-sticky-note me-1"/>').appendTo(noteLine);
                jQuery('<span/>').html(AdminListUi.highlight(note, term)).appendTo(noteLine);
            }

            // date + times
            const tdDate = new Td2({value: ''});
            tdDate.appendTo(tr);
            const date = moment(entry.date?.split(' ')[0]);
            jQuery('<div class="fw-semibold text-nowrap"/>')
            .text(date.isValid() ? date.format('YYYY.MM.DD') : '—')
            .appendTo(tdDate.getElement());

            const sightFrom = entry.duration_from ?? '';
            const sightUntil = entry.duration_until ?? '';

            if (sightFrom !== '' || sightUntil !== '') {
                subline(tdDate.getElement(), 'far fa-eye', esc(`${sightFrom} – ${sightUntil}`), 'Duration');
            }

            const tourStart = entry.tour_start ?? '';
            const tourEnd = entry.tour_end ?? '';

            if (tourStart !== '' || tourEnd !== '') {
                subline(tdDate.getElement(), 'far fa-clock', esc(`${tourStart} – ${tourEnd}`), 'Time begin-end');
            }

            // vehicle, driver, organization, tour
            const tdTour = new Td2({value: ''});
            tdTour.appendTo(tr);
            const vehicleName = mvehicles.get(entry.vehicle_id!)?.name ?? '';
            const driverName = mdrivers.get(entry.vehicle_driver_id!)?.user.name ?? '';
            const orgName = entry.organization_id ? morganizations.get(entry.organization_id)?.description ?? '' : '';

            const vehicle = jQuery('<div class="text-nowrap"/>').appendTo(tdTour.getElement());
            jQuery('<i class="fas fa-ship me-1 text-body-secondary"/>').appendTo(vehicle);
            jQuery('<span class="fw-semibold"/>').text(vehicleName === '' ? '—' : vehicleName).appendTo(vehicle);

            if (driverName !== '') {
                subline(tdTour.getElement(), 'fas fa-user', esc(driverName), 'Driver');
            }

            if (orgName !== '') {
                subline(tdTour.getElement(), 'fas fa-building', esc(orgName), 'Organization');
            }

            const tourLink = subline(tdTour.getElement(), 'fas fa-route', '', 'Show tour on the map');
            jQuery('<a href="#" class="text-decoration-none"/>')
            .text(`${lang.l('Tour')} #${entry.tour_id}`)
            .on('click', (e): void => {
                e.preventDefault();
                Nav.load(new ToursMap(entry.tour_id)).then();
            })
            .appendTo(tourLink);

            // group size + subgroups + photos
            const tdGroup = new Td2({value: ''});
            tdGroup.appendTo(tr);

            if (entry.species_count === 0) {
                AdminListUi.pill(tdGroup.getElement(), '0', 'danger', 'fas fa-exclamation-triangle')
                .attr('title', lang.l('Group size not set'));
            } else {
                jQuery('<span class="fs-6 fw-semibold"/>').text(`${entry.species_count}`).appendTo(tdGroup.getElement());
            }

            subline(
                tdGroup.getElement(),
                'fas fa-sitemap',
                `${esc(lang.l('Subgroups'))}: ${esc(lang.l(UtilSelect.getSelectStr(entry.subgroups!)))}`
            );

            const photos = jQuery('<div class="mt-1"/>').appendTo(tdGroup.getElement());
            const photoTaken = entry.photo_taken ?? -1;
            AdminListUi.pill(
                photos,
                UtilSelect.getSelectStr(photoTaken),
                photoTaken === 1 ? 'success' : 'secondary',
                'fas fa-camera'
            ).attr('title', lang.l('Photos taken'));

            // location + distance to coast + track points
            const tdLocation = new Td2({value: ''});
            tdLocation.appendTo(tr);
            const location = new LocationDisplay(tdLocation.getElement(), entry.location_begin!, () => {
                Nav.load(new ToursMap(entry.tour_id)).then();
            });

            // the widget is a <dl class="row"> with grid columns — compact it for the table cell
            location.getElement().addClass('mb-1 flex-nowrap g-0 text-nowrap');
            location.getElement().find('dt').removeClass('col-sm-1').addClass('col-auto me-1');
            location.getElement().find('dd').removeClass('col-sm-5').addClass('col-auto mb-0');

            const fDistance = parseFloat(entry.distance_coast!) || 0;
            const distance = subline(
                tdLocation.getElement(),
                'fas fa-water',
                `${esc(UtilDistanceCoast.meterToM(fDistance, true))} ${esc(lang.l('mi to the coast'))}`,
                'Distance (Miles)'
            );

            if (entry.distance_coast_estimation_gps === 1) {
                jQuery('<span class="ms-1 text-warning-emphasis"/>')
                .text(`(${lang.l('estimated')})`)
                .attr('title', lang.l('E. without GPS'))
                .appendTo(distance);
            }

            const trackCount = entry.track_point_count ?? 0;
            const tracks = jQuery('<div class="mt-1"/>').appendTo(tdLocation.getElement());
            AdminListUi.pill(
                tracks,
                `${trackCount} ${lang.l('track pts')}`,
                trackCount > 0 ? 'secondary' : 'danger',
                'fas fa-route'
            );

            // behaviour + reaction
            const tdBehaviour = new Td2({value: ''});
            tdBehaviour.appendTo(tr);
            const behaviourNames = SightingPopup.parseIdMapNames(
                entry.behaviours ?? '',
                (id) => mbehaviours.get(id)?.name
            );
            const behaviourPills = jQuery('<div class="d-flex flex-wrap gap-1 mb-1"/>').appendTo(tdBehaviour.getElement());

            if (behaviourNames.length === 0) {
                jQuery('<span class="small text-body-tertiary"/>').text(lang.l('not set')).appendTo(behaviourPills);
            } else {
                for (const name of behaviourNames) {
                    AdminListUi.pill(behaviourPills, name, 'primary');
                }
            }

            const reaction = jQuery('<div class="small text-nowrap"/>').appendTo(tdBehaviour.getElement());
            jQuery('<span class="text-body-secondary me-1"/>').text(`${lang.l('Reaction')}:`).appendTo(reaction);
            // eslint-disable-next-line no-new
            new ReactionDisplay(reaction, entry, mencates);

            // created / updated
            const tdCreated = new Td2({value: ''});
            tdCreated.appendTo(tr);
            const createDate = moment(entry.create_datetime * 1000);
            const updateDate = moment(entry.update_datetime * 1000);
            jQuery('<div class="small text-nowrap"/>').text(createDate.format('YYYY.MM.DD HH:mm')).appendTo(tdCreated.getElement());

            if (entry.creater_name !== '') {
                subline(tdCreated.getElement(), 'fas fa-user-edit', AdminListUi.highlight(entry.creater_name, term), 'Created by');
            }

            if (entry.update_datetime > 0 && entry.update_datetime !== entry.create_datetime) {
                subline(tdCreated.getElement(), 'fas fa-history', esc(updateDate.format('YYYY.MM.DD HH:mm')), 'Updated');
            }

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);

            // Old (hand-imported) rows are read-only — no edit/delete menu.
            if (entry.is_old) {
                jQuery('<div class="text-end text-body-tertiary"/>')
                .attr('title', lang.l('Old data – entered by hand, read-only'))
                .html('<i class="fas fa-lock"></i>')
                .appendTo(tdAction.getElement());
                return;
            }

            const actions = AdminListUi.actions(tdAction.getElement(), (): void => openEdit(entry));

            if (entry.files.length > 0) {
                const btnAttachment = new ButtonMenu2({icon: IconFa.paperclip, positionRight: true});
                btnAttachment.appendTo(actions);
                btnAttachment.getElement().attr('title', `${entry.files.length} ${lang.l('Photos')}`);

                for (const fname of entry.files) {
                    btnAttachment.addMenuItem(fname, (): void => showImage(entry, fname), IconFa.camera);
                }
            }

            const abtnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            abtnMenu.appendTo(actions);

            abtnMenu.addMenuItem(lang.l('Edit'), (): void => openEdit(entry), IconFa.edit);
            abtnMenu.addMenuItem(lang.l('Fishing vessels'), (): void => {
                showFishingVessels(entry).catch(() => undefined);
            }, 'fas fa-ship');
            abtnMenu.addDivider();
            abtnMenu.addMenuItem(lang.l('Delete'), (): void => {
                this._sightingDeletedDialog.setTitle(lang.l('Delete a sighting'));
                this._sightingDeletedDialog.resetValues();
                this._sightingDeletedDialog.setSightingId(entry.id);
                this._sightingDeletedDialog.show();
            }, IconFa.trash);
        };

        // Hook the data source — TableWrapper drives infinite scroll itself ----------------------
        this._onLoadTable = async(): Promise<void> => {
            await tableWrapper.reset();
        };

        tableWrapper.setDataSource(
            async(page) => {
                card.showLoading();

                try {
                    const offset = page * Sighting._PAGE_SIZE;
                    const response = await SightingsAPI.getList(buildApiFilter(offset, Sighting._PAGE_SIZE));

                    if (!response) {
                        return [];
                    }

                    if (page === 0) {
                        // Reset only on first page so subsequent infinite-scroll pages add to existing markers.
                        if (this._map) {
                            this._map.clearFeatureList();
                        }
                        dataGeneration++;
                        backfillCancelled = true;
                        dashboardKey = '';
                        loadedEntries.length = 0;
                        loadedIds.clear();
                        dashboard.clear();
                        analytics.clear();
                        yearCompare.clear();
                        yearCompareLoaded = false;
                    }

                    const added = pushLoaded(response.list);

                    /*
                     * If the user already has the movements layer open,
                     * append tracks for the newly arrived page only —
                     * cheaper than re-fetching for the whole accumulated
                     * set on every infinite-scroll tick.
                     */
                    await appendMovementsForEntries(added);

                    totalCount = response.count;
                    renderTitle(response.count);
                    updateLoadInfo();
                    AdminListUi.setEmpty(emptyInfo, response.count === 0);

                    // Map / Analytics open → load the rest of the new result right away
                    if (page === 0 && (activeTab === 'map' || activeTab === 'analytics')) {
                        setTimeout((): void => {
                            loadRemaining().catch(() => undefined);
                        }, 0);
                    }

                    return response.list;
                } finally {
                    card.hideLoading();
                    Lang.i().lAll();
                    Tooltip2.init();

                    if (this._map) {
                        await this._map.refrech();
                    }
                }
            },
            renderRow
        );

        // Filter dialog + saved presets --------------------------------------------------------
        const tr = (key: string): string => Lang.i().l(key) ?? key;
        const optionLabel = (options: SelectOption2[], id: number): string => options.find((o) => o.key === `${id}`)?.value ?? `${id}`;
        const all: SelectOption2 = {key: '', value: tr('— all —')};

        const filterConfig: TableFilterModalConfig = {
            sortColumns: [
                {key: 'id', label: tr('Id')},
                {key: 'tour_id', label: tr('TourId')},
                {key: 'date', label: tr('Date')},
                {key: 'tour_start', label: tr('Time begin-end')},
                {key: 'create_datetime', label: tr('Created')},
                {key: 'update_datetime', label: tr('Updated')}
            ],
            toggles: [{key: 'include_old', label: tr('Alte Daten (manuell erfasst) einblenden')}],
            selects: [
                {key: 'species', label: tr('Species'), options: [all, ...speciesOptions]},
                {key: 'organization', label: tr('Organization'), options: [all, ...organizationOptions]},
                {key: 'vehicle', label: tr('Vehicle'), options: [all, ...vehicleOptions]},
                {key: 'driver', label: tr('Driver'), options: [all, ...driverOptions]}
            ],
            search: true,
            periodModes: [
                {key: '', value: tr('— all —')},
                {key: 'absolute', value: tr('Fixed dates')},
                {key: 'current_year', value: tr('Current year')},
                {key: 'last_year', value: tr('Last year')},
                {key: 'last_30_days', value: tr('Last 30 days')},
                {key: 'last_90_days', value: tr('Last 90 days')},
                {key: 'last_365_days', value: tr('Last 365 days')}
            ]
        };

        const isDefaultSort = (): boolean => SightingTableFilter.SORT_KEYS.every((key) => 
            key === 'date' || key === 'tour_start' ? sort[key] === SortOrder2.DESC : sort[key] === SortOrder2.NONE);

        // current list state -> dialog values
        const currentValues = (name: string): TableFilterModalValues => {
            const sortKey = isDefaultSort()
                ? ''
                : SightingTableFilter.SORT_KEYS.find((key) => sort[key] !== SortOrder2.NONE) ?? '';

            return {
                name,
                sortKey,
                sortDir: sortKey !== '' && sort[sortKey as SortKey] === SortOrder2.ASC ? 'asc' : 'desc',
                toggles: {include_old: filterValues.include_old},
                selects: {
                    species: filterValues.species_id > 0 ? `${filterValues.species_id}` : '',
                    organization: filterValues.organization_id > 0 ? `${filterValues.organization_id}` : '',
                    vehicle: filterValues.vehicle_id > 0 ? `${filterValues.vehicle_id}` : '',
                    driver: filterValues.vehicle_driver_id > 0 ? `${filterValues.vehicle_driver_id}` : ''
                },
                search: filterValues.search,
                periodMode,
                periodFrom: periodMode === 'absolute' ? filterValues.period_from : '',
                periodTo: periodMode === 'absolute' ? filterValues.period_to : ''
            };
        };

        // dialog values -> stored settings
        const toSettings = (values: TableFilterModalValues): SightingTableFilterSettings => {
            const id = (key: string): number => {
                const n = parseInt(values.selects[key] ?? '', 10);
                return Number.isFinite(n) && n > 0 ? n : 0;
            };

            return {
                sort_key: values.sortKey,
                sort_dir: values.sortDir,
                period_mode: values.periodMode,
                period_from: values.periodFrom,
                period_to: values.periodTo,
                species_id: id('species'),
                organization_id: id('organization'),
                vehicle_id: id('vehicle'),
                vehicle_driver_id: id('driver'),
                search: values.search,
                include_old: values.toggles.include_old ?? false
            };
        };

        const updateFilterHint = (): void => {
            const hints: string[] = [];

            if (filterValues.period_from !== '' || filterValues.period_to !== '') {
                hints.push(`${filterValues.period_from || '…'} – ${filterValues.period_to || '…'}`);
            }

            if (filterValues.species_id > 0) {
                hints.push(optionLabel(speciesOptions, filterValues.species_id));
            }

            if (filterValues.organization_id > 0) {
                hints.push(optionLabel(organizationOptions, filterValues.organization_id));
            }

            if (filterValues.vehicle_id > 0) {
                hints.push(optionLabel(vehicleOptions, filterValues.vehicle_id));
            }

            if (filterValues.vehicle_driver_id > 0) {
                hints.push(optionLabel(driverOptions, filterValues.vehicle_driver_id));
            }

            if (filterValues.search !== '') {
                hints.push(`„${filterValues.search}“`);
            }

            if (filterValues.include_old) {
                hints.push(tr('incl. old data'));
            }

            filterHint.text(hints.length > 0 ? `· ${hints.join(' · ')}` : '');
        };

        // apply dialog values to the list (ad hoc, nothing stored)
        const applyValues = (values: TableFilterModalValues): void => {
            Object.assign(filterValues, SightingTableFilter.toFilterValues(toSettings(values), new Date()));
            periodMode = values.periodMode;

            for (const key of SightingTableFilter.SORT_KEYS) {
                sort[key] = SortOrder2.NONE;
            }

            if (values.sortKey === '') {
                sort.date = SortOrder2.DESC;
                sort.tour_start = SortOrder2.DESC;
            } else {
                sort[values.sortKey as SortKey] = values.sortDir === 'asc' ? SortOrder2.ASC : SortOrder2.DESC;
            }

            for (const entry of sortRegistry) {
                SortingColumn2.initSort(entry.column, sort[entry.key]);
            }

            updateFilterHint();
            syncToolbar();
            tableWrapper.reset();
        };

        applyQuick = (mutate): void => {
            const values = currentValues('');
            mutate(values);
            applyValues(values);
        };

        const savePreset = async(unid: string, values: TableFilterModalValues): Promise<void> => {
            try {
                const savedUnid = await TableFilterAPI.save({
                    unid,
                    table_name: TABLE_FILTER_SIGHTING,
                    name: values.name,
                    settings: JSON.stringify(toSettings(values)),
                    position: 0
                });

                this._toast.fire({icon: 'success', title: tr('Filter saved')});

                await Nav.refreshMenu();
                await Nav.load(new (Sighting.presetPage(savedUnid))());
            } catch (err) {
                this._toast.fire({icon: 'error', title: `${tr('Save failed')}: ${(err as Error).message}`});
            }
        };

        const getModal = (): TableFilterModal => {
            if (Sighting._filterModal === null) {
                Sighting._filterModal = new TableFilterModal();
            }

            return Sighting._filterModal;
        };

        /*
         * Open the dialog prefilled with the current list state. "Apply" filters
         * ad hoc; "Save" stores a new preset — or updates `current` when given.
         */
        const askFilter = async(title: string, name: string, current: TableFilterEntry|null): Promise<void> => {
            const result = await getModal().ask(title, filterConfig, currentValues(name));

            if (result === null) {
                return;
            }

            if (result.action === 'apply') {
                applyValues(result.values);
                return;
            }

            await savePreset(current?.unid ?? '', result.values);
        };

        openFilterDialog = (): void => {
            askFilter(tr('Filter'), '', null).catch(() => undefined);
        };

        openFilterMenu = (event: JQuery.ClickEvent): void => {
            event.preventDefault();
            event.stopPropagation();

            if (Sighting._filterMenu === null) {
                Sighting._filterMenu = new ContextMenu2();
            }

            const menu = Sighting._filterMenu;

            menu.clear();
            menu.addItem({
                label: tr('Filter …'),
                icon: 'fas fa-filter',
                onClick: (): void => openFilterDialog()
            });

            menu.addItem({
                label: tr('New saved filter'),
                icon: 'fas fa-plus',
                onClick: (): void => {
                    askFilter(tr('New saved filter'), '', null).catch(() => undefined);
                }
            });

            if (SightingTableFilter.isActive(filterValues) || !isDefaultSort()) {
                menu.addItem({
                    label: tr('Reset filter'),
                    icon: 'fas fa-undo',
                    onClick: (): void => {
                        Nav.load(new Sighting(this._presetUnid)).catch(() => undefined);
                    }
                });
            }

            if (preset !== null) {
                const current = preset;
                const presetName = AdminListUi.escape(current.name);

                menu.addItem({divider: true});

                menu.addItem({
                    label: `${AdminListUi.escape(tr('Edit'))} „${presetName}“`,
                    icon: 'fas fa-pen',
                    onClick: (): void => {
                        askFilter(tr('Edit saved filter'), current.name, current).catch(() => undefined);
                    }
                });

                menu.addItem({
                    label: `${AdminListUi.escape(tr('Delete'))} „${presetName}“`,
                    icon: 'fas fa-trash text-danger',
                    onClick: (): void => {
                        DialogConfirm2.confirm(
                            'dcTableFilterDelete',
                            ModalDialogType2.small,
                            tr('Delete filter'),
                            jQuery('<span/>').text(`${tr('Delete saved filter?')} „${current.name}“`),
                            async(_, dialog): Promise<void> => {
                                dialog.hide();

                                try {
                                    await TableFilterAPI.delete(current.unid);
                                    this._toast.fire({icon: 'success', title: tr('Filter deleted')});
                                    await Nav.refreshMenu();
                                    await Nav.load(new Sighting());
                                } catch (err) {
                                    this._toast.fire({icon: 'error', title: (err as Error).message});
                                }
                            },
                            undefined,
                            tr('Delete'),
                            ButtonClass2.danger
                        );
                    }
                });
            }

            menu.showAt(event.clientX, event.clientY);
        };

        updateFilterHint();
    }

    /**
     * Push one sighting onto the map (used both by the table renderer and the bulk
     * "load all" backfill). Silently ignores entries without a valid begin location.
     */
    protected _addSightingToMap(entry: SightingsEntry, lookups: SightingPopupLookups): void {
        if (!this._map) {
            return;
        }

        const bgeol = UtilLocation.strToGeolocationCoordinates(entry.location_begin!);
        if (!bgeol) {
            return;
        }

        const objectType = entry.pointtype ?? `${SightingMapObjectType.Testudines}`;

        this._mapEntries.set(entry.unid!, entry);

        this._map.addSighting(
            objectType,
            entry.unid!,
            () => this._buildSightingPopup(entry, lookups),
            UtilLocation.geoLocationToOlCoordinates(bgeol)
        );
    }

    /**
     * Build the rich map-popover content for a sighting: the coloured species
     * badge plus the key fields (mirroring the list columns). Returned as a
     * detached div; the map serialises it to an HTML string for the Bootstrap
     * popover, so the content is static (no live click handlers).
     * @param {SightingsEntry} entry
     * @param {SightingPopupLookups} lookups
     * @return {JQuery}
     * @protected
     */
    protected _buildSightingPopup(entry: SightingsEntry, lookups: SightingPopupLookups): JQuery {
        const lang = Lang.i();
        const div = jQuery('<div class="sighting-popup" style="min-width:230px;"/>');

        // Species picture (own centered row): uploaded image, else silhouette from images/species/*.svg + badge.
        const specie = entry.species_id ? lookups.species.get(entry.species_id) : undefined;
        const silName = specie?.name ?? entry.other ?? '';
        const silWrap = jQuery('<div style="display:flex;justify-content:center;margin-bottom:4px;"/>').appendTo(div);
        silWrap[0]?.insertAdjacentHTML('beforeend', UtilSpeciesSilhouette.img(silName, 54, SpeciesAPI.imageUrl(specie)));

        const head = jQuery('<div class="mb-1" style="text-align:center;"/>').appendTo(div);
        // eslint-disable-next-line no-new
        new SpeciesDisplay(head, entry, lookups.species);

        const rows: [string, string][] = SightingPopup.rows(entry, lookups);

        const trs = rows
        .filter(([, value]) => value !== '')
        .map(([label, value]) =>
            '<tr><td style="color:#6c757d;white-space:nowrap;vertical-align:top;padding:1px 8px 1px 0;">' +
            `${AdminListUi.escape(lang.l(label))}</td>` +
            `<td style="vertical-align:top;padding:1px 0;">${AdminListUi.escape(value)}</td></tr>`)
        .join('');

        jQuery(`<table style="font-size:0.82rem;border-collapse:collapse;"><tbody>${trs}</tbody></table>`).appendTo(div);

        Sighting._buildSightingPopupActions(entry).appendTo(div);

        return div;
    }

    /**
     * Action bar of the map popover: open the sighting and show its tour as
     * buttons, zoom / species profile / photo / fishing vessels as icons.
     * The popover is serialised HTML, so the buttons only carry
     * `data-map-action` + `data-map-value` (the unid); the page handles them
     * via SightingMap.setOnPopupAction.
     * @param {SightingsEntry} entry
     * @return {JQuery}
     * @protected
     */
    protected static _buildSightingPopupActions(entry: SightingsEntry): JQuery {
        const lang = Lang.i();
        const unid = entry.unid ?? '';
        const bar = jQuery('<div class="mwpa-map-popup-actions"/>');

        const button = (parent: JQuery, action: string, icon: string, label: string, text: boolean): void => {
            const btn = jQuery('<button type="button" class="btn btn-sm"/>')
            .addClass(text ? 'btn-outline-primary text-start' : 'btn-outline-secondary')
            .attr('data-map-action', action)
            .attr('data-map-value', unid)
            .attr('title', lang.l(label))
            .appendTo(parent);

            jQuery('<i/>').addClass(`${icon} fa-fw`).appendTo(btn);

            if (text) {
                jQuery('<span class="ms-1"/>').text(lang.l(label)).appendTo(btn);
            }
        };

        // the popover is at most 276px wide — the labelled buttons stack, full width
        const main = jQuery('<div class="d-grid gap-1"/>').appendTo(bar);

        if (!entry.is_old) {
            button(main, 'open', 'fas fa-pen', 'Open sighting', true);
        }

        if (entry.tour_id > 0) {
            button(main, 'tour', 'fas fa-route', 'Show tour', true);
        }

        const tools = jQuery('<div class="d-flex gap-1 mt-1"/>').appendTo(bar);

        button(tools, 'zoom', 'fas fa-search-plus', 'Zoom in', false);

        if (entry.species_id) {
            button(tools, 'species', 'fas fa-book-open', 'Species profile', false);
        }

        if (entry.files.length > 0) {
            button(tools, 'photo', 'fas fa-camera', 'Photos', false);
        }

        if (!entry.is_old) {
            button(tools, 'fishing', 'fas fa-ship', 'Fishing vessels', false);
        }

        return bar;
    }

    /**
     * Center the map on a sighting, zoomed in close.
     * @param {SightingsEntry} entry
     * @protected
     */
    protected _zoomToSighting(entry: SightingsEntry): void {
        const geo = UtilLocation.strToGeolocationCoordinates(entry.location_begin!);
        const view = this._map?.getOlMap()?.getView();

        if (!geo || !view) {
            return;
        }

        view.animate({
            center: fromLonLat(UtilLocation.geoLocationToOlCoordinates(geo)),
            zoom: Math.max(view.getZoom() ?? 0, 14),
            duration: 400
        });
    }

}