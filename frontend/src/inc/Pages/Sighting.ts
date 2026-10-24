/* global JQuery */
import {
    Badge2,
    BadgeType2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    DialogConfirm2,
    DialogInfo2,
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
    Tooltip2,
    Tr2
} from 'bambooo';
import moment from 'moment';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat} from 'ol/proj';
import {BehaviouralStateEntry, BehaviouralStates as BehaviouralStatesAPI} from '../Api/BehaviouralStates';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Organization as OrganizationAPI, OrganizationEntry} from '../Api/Organization';
import {SightingMovement as SightingMovementAPI} from '../Api/SightingMovement';
import {SightingFishingVessel as SightingFishingVesselAPI, SightingFishingVesselEntry} from '../Api/SightingFishingVessel';
import {Sightings as SightingsAPI, SightingsEntry, SightingsFilter} from '../Api/Sightings';
import {Species as SpeciesAPI, SpeciesEntry} from '../Api/Species';
import {User as UserAPI} from '../Api/User';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {Lang} from '../Lang';
import {PageLoader} from '../PageLoader';
import {UtilDistanceCoast} from '../Utils/UtilDistanceCoast';
import {UtilLocation} from '../Utils/UtilLocation';
import {UtilSelect} from '../Utils/UtilSelect';
import {LocationDisplay} from '../Widget/LocationDisplay';
import {ReactionDisplay} from '../Widget/ReactionDisplay';
import {SightingAnalytics} from '../Widget/SightingAnalytics';
import {SightingDashboard} from '../Widget/SightingDashboard';
import {SightingExport} from '../Widget/SightingExport';
import {SightingMap, SightingMapObjectType} from '../Widget/SightingMap';
import {SightingYearCompare} from '../Widget/SightingYearCompare';
import {SpeciesDisplay} from '../Widget/SpeciesDisplay';
import {BasePage} from './BasePage';
import {MovementSettingsModal} from './Sighting/MovementSettingsModal';
import {SpeciesProfile as SpeciesProfilePage} from './Species/Profile';
import {SightingDeletedModal} from './Sighting/SightingDeletedModal';
import {SightingEditModal} from './Sighting/SightingEditModal';
import {SightingFilter, SightingFilterValues} from './Sighting/SightingFilter';
import {ToursMap} from './Tours/TourMap';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'tour_id' | 'date' | 'tour_start' | 'create_datetime' | 'update_datetime';

type SortState = Record<SortKey, SortOrder2>;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

/**
 * Wrap any (case-insensitive) match of `term` in `<mark>` so search hits are
 * highlighted in the rendered cells. HTML in the source text is escaped first;
 * the term is regex-escaped before matching.
 */
const highlight = (text: string, term: string): string => {
    if (text === '') {
        return '';
    }

    const escaped = escapeHtml(text);

    if (term === '') {
        return escaped;
    }

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return escaped.replace(new RegExp(`(${escapedTerm})`, 'giu'), '<mark>$1</mark>');
};

/**
 * Sighting page.
 */
export class Sighting extends BasePage {

    protected override _name: string = 'sighting';

    protected _sightingDialog: SightingEditModal;
    protected _sightingDeletedDialog: SightingDeletedModal;
    protected _movementSettingsDialog: MovementSettingsModal;
    protected _map: SightingMap|null = null;

    public constructor() {
        super();

        this._sightingDialog = new SightingEditModal();

        this._sightingDeletedDialog = new SightingDeletedModal();

        this._movementSettingsDialog = new MovementSettingsModal();

        this._sightingDialog.setOnSave(async(): Promise<void> => {
            const sid = this._sightingDialog.getSightingId();

            /*
             * Add-flow is not wired yet — the modal doesn't capture tour_id/unid/etc.
             * needed for an INSERT, so the backend save endpoint is update-only.
             */
            if (sid === null) {
                this._toast.fire({icon: 'error', title: 'Creating new sightings via this dialog is not supported yet.'});
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
                    this._toast.fire({icon: 'success', title: 'Sighting saved.'});
                    this._sightingDialog.hide();
                } else {
                    this._toast.fire({icon: 'error', title: 'Sighting save failed.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        this._sightingDeletedDialog.setOnSave(async(): Promise<void> => {
            const tid = this._sightingDeletedDialog.getSightingId();

            if (tid === null) {
                this._toast.fire({icon: 'error', title: 'ID is not set!'});
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

                    this._toast.fire({icon: 'success', title: 'Sighting delete success.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }

            this._sightingDeletedDialog.hide();
        });
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

        const filterValues: SightingFilterValues = {
            period_from: '',
            period_to: '',
            species_id: 0,
            organization_id: 0,
            vehicle_id: 0,
            vehicle_driver_id: 0,
            search: '',
            include_old: false
        };

        let inHeaderSearch = '';
        let totalCount = 0;
        let loadedCount = 0;
        /*
         * Mirrors what's been streamed onto the map; fed into the crossfilter dashboard
         * and re-used to redraw the map when the dashboard filters change.
         */
        const loadedEntries: SightingsEntry[] = [];

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

        // Filter card ---------------------------------------------------------------------------
        const content = this._wrapper.getContentWrapper().getContent();
        const rowFilter = new ContentRow2(content.getContentFluidElement());
        const filter = new SightingFilter();
        filter.appendTo(new ContentCol2(rowFilter, ContentColSize2.col12).getElement());

        // Lookup maps + initial loads -----------------------------------------------------------
        const mspecies = new Map<number, SpeciesEntry>();
        const mvehicles = new Map<number, VehicleEntry>();
        const mdrivers = new Map<number, VehicleDriverEntry>();
        const mbehaviours = new Map<number, BehaviouralStateEntry>();
        const mencates = new Map<number, EncounterCategorieEntry>();
        const morganizations = new Map<number, OrganizationEntry>();

        const [
            species,
            vehicles,
            drivers,
            behaviours,
            encates,
            organizations
        ] = await Promise.all([
            SpeciesAPI.getList(),
            VehicleAPI.getList(),
            VehicleDriverAPI.getList(),
            BehaviouralStatesAPI.getList(),
            EncounterCategoriesAPI.getList(),
            OrganizationAPI.getOrganizationByUser()
        ]);

        if (species) {
            for (const s of species) {
                mspecies.set(s.id, s);
            }
            this._sightingDialog.setSpeciesList(species);
            filter.setSpeciesList(species);
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
            filter.setVehicleList(activeVehicles);
        }

        if (drivers) {
            for (const d of drivers) {
                mdrivers.set(d.id, d);
            }
            this._sightingDialog.setVehicleDriverList(drivers);
            filter.setDriverList(drivers);
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
            filter.setOrganizationList(organizations);
        }

        // List card -----------------------------------------------------------------------------
        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Sighting'}));

        const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
        btnMenu.appendTo(card.getToolsElement());

        btnMenu.addMenuItem(new LangTextV2({text: 'Filter'}), () => {
            filter.show();
        }, 'fa fa-filter');

        /*
         * Admin-only: trigger a full rebuild of derived movement data
         * (sighting_movement + sighting_movement_track). Synchronous on the
         * server side, so the button stays in a "running" state until the
         * server returns counts. Filter for admin happens after the
         * currentuser lookup further down — see below.
         */
        const rebuildMovementsLabel = new LangTextV2({text: 'Rebuild movements'});
        const triggerRebuildMovements = async(): Promise<void> => {
            const confirmed = window.confirm(
                Lang.i().l('Rebuild every sighting\'s movement track now? This may take a while.')
                ?? 'Rebuild every sighting\'s movement track now? This may take a while.'
            );
            if (!confirmed) {
                return;
            }

            this._toast.fire({
                icon: 'info',
                title: Lang.i().l('Rebuilding movements…') ?? 'Rebuilding movements…'
            });

            try {
                const msg = await SightingMovementAPI.rebuildAll();
                this._toast.fire({
                    icon: 'success',
                    title: `${Lang.i().l('Rebuild done') ?? 'Rebuild done'} (${msg})`
                });

                // Refresh the page so the new tracks show up on the map.
                if (this._onLoadTable) {
                    await this._onLoadTable();
                }
            } catch (err) {
                this._toast.fire({
                    icon: 'error',
                    title: `${Lang.i().l('Rebuild failed') ?? 'Rebuild failed'}: ${(err as Error).message}`
                });
            }
        };

        /*
         * Admin-only: edit the persisted MovementConfig (lead/trail/outlier/tz).
         * Fetched fresh on each open so a hand-edit to the settings row from
         * another path (admin SQL, another browser tab) doesn't get clobbered.
         */
        const movementSettingsLabel = new LangTextV2({text: 'Movement settings'});
        const openMovementSettings = async(): Promise<void> => {
            try {
                const cfg = await SightingMovementAPI.getConfig();
                this._movementSettingsDialog.setTitle(new LangTextV2({text: 'Movement settings'}));
                this._movementSettingsDialog.setConfig(cfg);
                this._movementSettingsDialog.show();
            } catch (err) {
                this._toast.fire({
                    icon: 'error',
                    title: `${Lang.i().l('Load failed') ?? 'Load failed'}: ${(err as Error).message}`
                });
            }
        };

        this._movementSettingsDialog.setOnSave(async(): Promise<void> => {
            try {
                await SightingMovementAPI.saveConfig(this._movementSettingsDialog.getConfig());
                this._toast.fire({
                    icon: 'success',
                    title: Lang.i().l('Settings saved') ?? 'Settings saved'
                });
                this._movementSettingsDialog.hide();
            } catch (err) {
                this._toast.fire({
                    icon: 'error',
                    title: `${Lang.i().l('Save failed') ?? 'Save failed'}: ${(err as Error).message}`
                });
            }
        });

        /*
         * In-header quick-search — sibling of .card-title in the card-header so AdminLTE's
         * float layout puts it directly right of the title (and left of the tools menu).
         */
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());

        const searchInput = new Input2({type: InputType2.text});
        searchInput.appendTo(searchSlot);
        searchInput.setPlaceholder('search note / recognizable …');

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

        const lang = Lang.i();
        navContainer.append(`<li class="nav-item"><a class="nav-link active" data-toggle="tab" href="#${listTabId}">${lang.l('List')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${mapTabId}" data-toggle="tab">${lang.l('Map')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${analyticsTabId}" data-toggle="tab">${lang.l('Analytics')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${yearCompareTabId}" data-toggle="tab">${lang.l('Year comparison')}</a></li>`);
        navContainer.append(`<li class="nav-item"><a class="nav-link" href="#${exportTabId}" data-toggle="tab">${lang.l('Export')}</a></li>`);

        const listBody = jQuery(`<div class="tab-pane fade active show" id="${listTabId}"/>`).appendTo(tabBodies);
        const mapBody = jQuery(`<div class="tab-pane fade" id="${mapTabId}"/>`).appendTo(tabBodies);
        const analyticsBody = jQuery(`<div class="tab-pane fade" id="${analyticsTabId}"/>`).appendTo(tabBodies);
        const yearCompareBody = jQuery(`<div class="tab-pane fade" id="${yearCompareTabId}"/>`).appendTo(tabBodies);
        const exportBody = jQuery(`<div class="tab-pane fade" id="${exportTabId}"/>`).appendTo(tabBodies);

        // Dashboard (crossfilter + dc.js) sits on top of the map, fed from `loadedEntries` -------
        const dashboard = new SightingDashboard(mapBody);
        const mapContainer = jQuery('<div/>').appendTo(mapBody);

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
                this._addSightingToMap(entry, mspecies);
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
        analytics.setLookups({species: mspecies});

        // Year-comparison tab (loads its own dataset, ignoring period filter) -------------------
        const yearCompare = new SightingYearCompare(yearCompareBody);
        let yearCompareLoaded = false;

        /*
         * Both Map and Analytics tabs work off `loadedEntries`. The list streams it page-by-page,
         * so on first tab-open we usually need to backfill the rest under the active filter.
         * Shared helper so Map and Analytics behave identically.
         */
        const refreshDataDashboards = (): void => {
            dashboard.setData(loadedEntries);
            analytics.setData(loadedEntries);
        };

        const triggerBackfillIfNeeded = (): void => {
            if (loadedCount >= totalCount) {
                refreshDataDashboards();
                return;
            }

            DialogConfirm2.confirm(
                'loadallsightings',
                ModalDialogType2.xlarge,
                'Load all ...',
                `Load all ${totalCount} sightings under the current filter?`,
                async(_, modal) => {
                    const remaining = totalCount - loadedCount;
                    const more = await SightingsAPI.getList(buildApiFilter(loadedCount, remaining));

                    if (more) {
                        for (const entry of more.list) {
                            loadedEntries.push(entry);
                            this._addSightingToMap(entry, mspecies);
                        }
                        loadedCount += more.list.length;

                        /*
                         * Backfill brought in N new sightings — append
                         * tracks for those only (the existing chunks are
                         * still valid). Skips silently when the layer is
                         * hidden, so closed-layer "load all" stays cheap.
                         */
                        await appendMovementsForEntries(more.list);

                        if (this._map) {
                            await this._map.refrech();
                        }
                    }

                    refreshDataDashboards();
                    modal.hide();
                }
            );
        };

        // Map ----------------------------------------------------------------------------------
        const currentuser = await UserAPI.getUserInfo();
        let viewCenter: Coordinate|null = null;

        if (currentuser?.organization) {
            viewCenter = fromLonLat([
                parseFloat(currentuser.organization.lon),
                parseFloat(currentuser.organization.lat)
            ]);
        }

        /*
         * Admin-only menu entry. We add it here (after the user-info lookup)
         * rather than at card-build time so non-admins don't see a no-op item.
         */
        if (currentuser?.user?.isAdmin) {
            btnMenu.addMenuItem(rebuildMovementsLabel, () => {
                triggerRebuildMovements().catch(() => undefined);
            }, 'fa fa-route');
            btnMenu.addMenuItem(movementSettingsLabel, () => {
                openMovementSettings().catch(() => undefined);
            }, 'fa fa-cog');
        }

        this._map = new SightingMap(mapContainer);
        let wHeight = jQuery(window).height();

        /*
         * Map height accounts for the dashboard sitting above it (~310px: ~140 time bar +
         * 220 row charts + spacing/header). Falls back to a sane minimum on small screens.
         */
        const dashboardHeight = 320;
        if (wHeight) {
            this._map.setHeight(Math.max(300, wHeight - 220 - dashboardHeight));
        }

        this._map.load({
            useHeatmap: true,
            useBathymetriemap: true
        });

        this._map.setView(viewCenter);

        await this._map.addAreaByJson('map_areas/ES7020123.json', 'ES7020123', 'sigthing_ES7020123_layer');
        await this._map.addAreaByJson('map_areas/ES7020122.json', 'ES7020122', 'sigthing_ES7020122_layer');
        await this._map.addAreaByJson('map_areas/ES0000526.json', 'ES0000526', 'sigthing_ES0000526_layer');

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

            wHeight = jQuery(window).height();
            if (wHeight) {
                this._map.setHeight(Math.max(300, wHeight - 220 - dashboardHeight));
                this._map.updateSize();
            }

            triggerBackfillIfNeeded();
        });

        navContainer.find(`a[href="#${analyticsTabId}"]`).on('shown.bs.tab', () => {
            triggerBackfillIfNeeded();
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

        navContainer.find(`a[href="#${yearCompareTabId}"]`).on('shown.bs.tab', () => {
            loadYearCompareIfNeeded().catch(() => undefined);
        });

        /*
         * Backfill all sightings under the active filter without prompting (used by the PDF
         * orchestrator — analytics + dashboard need the full set, but the user already
         * committed to "Generate PDF" so we don't ask twice).
         */
        const ensureAllSightingsLoaded = async(): Promise<void> => {
            if (loadedCount >= totalCount) {
                refreshDataDashboards();
                return;
            }

            const remaining = totalCount - loadedCount;
            const more = await SightingsAPI.getList(buildApiFilter(loadedCount, remaining));

            if (more) {
                for (const entry of more.list) {
                    loadedEntries.push(entry);
                    this._addSightingToMap(entry, mspecies);
                }
                loadedCount += more.list.length;

                if (this._map) {
                    await this._map.refrech();
                }
            }

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
        const table = tableWrapper.getTable();
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

        const thIdTourDate = new Th2({});
        thIdTourDate.addComponent(makeSortColumn('Id', 'id'));
        thIdTourDate.append('<br>');
        thIdTourDate.addComponent(makeSortColumn('TourId', 'tour_id'));
        thIdTourDate.append('<br>');
        thIdTourDate.addComponent(makeSortColumn('Date', 'date'));
        thIdTourDate.appendTo(trhead);

        const thVehicle = new Th2({});
        thVehicle.addComponent(new LangTextV2({text: 'Vehicle'}));
        thVehicle.append('<br>');
        thVehicle.addComponent(new LangTextV2({text: 'Driver'}));
        thVehicle.append('<br>');
        thVehicle.addComponent(new LangTextV2({text: 'Organization'}));
        thVehicle.appendTo(trhead);

        const thSpecies = new Th2({});
        thSpecies.addComponent(new LangTextV2({text: 'Species'}));
        thSpecies.append('<br>');
        thSpecies.addComponent(new LangTextV2({text: 'Other species'}));
        thSpecies.appendTo(trhead);

        const thGroupSize = new Th2({});
        thGroupSize.addComponent(new LangTextV2({text: 'Group-Size'}));
        thGroupSize.append('<br>');
        thGroupSize.addComponent(new LangTextV2({text: 'Subgroups'}));
        thGroupSize.appendTo(trhead);

        const thTime = new Th2({});
        thTime.addComponent(makeSortColumn('Time begin-end', 'tour_start'));
        thTime.append('<br>');
        thTime.addComponent(new LangTextV2({text: 'Duration'}));
        thTime.appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Location'})}).appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Distance<br>(Miles)'})}).appendTo(trhead);

        const thPhotos = new Th2({});
        thPhotos.addComponent(new LangTextV2({text: 'Photos taken'}));
        thPhotos.append('<br>');
        thPhotos.addComponent(new LangTextV2({text: 'E. without GPS'}));
        thPhotos.appendTo(trhead);

        const thBehaviour = new Th2({});
        thBehaviour.addComponent(new LangTextV2({text: 'Behaviour'}));
        thBehaviour.append('<br>');
        thBehaviour.addComponent(new LangTextV2({text: 'Reaction'}));
        thBehaviour.appendTo(trhead);

        const thCreated = new Th2({});
        thCreated.addComponent(makeSortColumn('Created', 'create_datetime'));
        thCreated.append('<br>');
        thCreated.addComponent(new LangTextV2({text: 'Created by'}));
        thCreated.append('<br>');
        thCreated.addComponent(makeSortColumn('Updated', 'update_datetime'));
        thCreated.appendTo(trhead);

        new Th2({value: ''}).appendTo(trhead);

        // Renderer ------------------------------------------------------------------------------
        const renderRow = (_table: Table2, entry: SightingsEntry): void => {
            const term = activeHighlight();
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());

            /* Historical hand-maintained rows (sighting_old): muted style + "ALT" badge, read-only. */
            if (entry.is_old) {
                trbody.getElement().addClass('mwpa-old-row').css('background-color', '#f5f1e8');
            }

            const date = moment(entry.date?.split(' ')[0]);

            const oldBadge = entry.is_old
                ? ' <span class="badge badge-secondary" title="Alte Daten – manuell erfasst, schreibgeschützt"><i class="fas fa-archive"></i> ALT</span>'
                : '';

            new Td2({
                value: `<b>#${entry.id}</b>${oldBadge}<br>#${entry.tour_id}<br>${date.format('YYYY.MM.DD')}`
            }).appendTo(trbody);

            const vehicleName = mvehicles.get(entry.vehicle_id!)?.name ?? '';
            const driverName = mdrivers.get(entry.vehicle_driver_id!)?.user.name ?? '';
            const orgStr = entry.organization_id ? morganizations.get(entry.organization_id)?.description ?? '' : '';

            new Td2({
                value: `${escapeHtml(vehicleName)}<br>${escapeHtml(driverName)}<br>${escapeHtml(orgStr)}`
            }).appendTo(trbody);

            let otherSpecies = '';
            try {
                const otherSpeciesList = JSON.parse(entry.other_species ?? '');
                if (otherSpeciesList) {
                    for (const key in otherSpeciesList) {
                        // eslint-disable-next-line prefer-object-has-own
                        if (Object.prototype.hasOwnProperty.call(otherSpeciesList, key)) {
                            const v = otherSpeciesList[key];
                            if (typeof v === 'string' && v.trim() !== '') {
                                const s = mspecies.get(parseInt(v, 10));
                                if (s) {
                                    if (otherSpecies !== '') {
                                        otherSpecies += ', ';
                                    }
                                    otherSpecies += s.name.split(',')[0];
                                }
                            }
                        }
                    }
                }
            } catch {
                otherSpecies = '';
            }

            const speciesTd = new Td2({value: ''});
            speciesTd.appendTo(trbody);
            // eslint-disable-next-line no-new
            new SpeciesDisplay(speciesTd.getElement(), entry, mspecies, (speciesId) => {
                PageLoader.getInstance().load(new SpeciesProfilePage(speciesId)).then();
            });
            speciesTd.append(`<br>${escapeHtml(otherSpecies)}`);

            const speciesCountGroupTd = new Td2({value: ''});
            speciesCountGroupTd.appendTo(trbody);
            if (entry.species_count === 0) {
                const badgeZero = new Badge2({type: BadgeType2.info, color: 'red'});
                badgeZero.appendTo(speciesCountGroupTd);
                badgeZero.getElement().html('<b style="color: white">0</b>');
            } else {
                speciesCountGroupTd.append(`<b>${entry.species_count}</b>`);
            }
            speciesCountGroupTd.append(`<br>${UtilSelect.getSelectStr(entry.subgroups!)}`);

            new Td2({
                value: `<b>${escapeHtml(entry.tour_start ?? '')} - ${escapeHtml(entry.tour_end ?? '')}</b><br>${escapeHtml(entry.duration_from ?? '')} - ${escapeHtml(entry.duration_until ?? '')}`
            }).appendTo(trbody);

            const tdLocation = new Td2({value: ''});
            tdLocation.appendTo(trbody);
            // eslint-disable-next-line no-new
            new LocationDisplay(tdLocation.getElement(), entry.location_begin!, () => {
                PageLoader.getInstance().load(new ToursMap(entry.tour_id)).then();
            });

            /*
             * Track-point indicator. Always rendered so the user can spot
             * at a glance which sightings have a real boat GPS track
             * behind them (segment_count + 1, grey) vs which only have
             * hand-entered begin/end anchors or no movement at all (0, red).
             */
            const trackCount = entry.track_point_count ?? 0;
            const trackLabel = Lang.i().l('track pts') ?? 'track pts';
            if (trackCount > 0) {
                tdLocation.append(
                    `<small class="text-muted"><i class="fas fa-route mr-1"></i>${trackCount} ${trackLabel}</small>`
                );
            } else {
                tdLocation.append(
                    `<small style="color:#dc3545"><i class="fas fa-route mr-1"></i>0 ${trackLabel}</small>`
                );
            }

            const fDistance = parseFloat(entry.distance_coast!) || 0;
            new Td2({value: `${UtilDistanceCoast.meterToM(fDistance, true)}`}).appendTo(trbody);

            new Td2({
                value: `<b>${UtilSelect.getSelectStr(entry.photo_taken!)}</b><br>${UtilSelect.getSelectStr(entry.distance_coast_estimation_gps!)}`
            }).appendTo(trbody);

            let behaviourStr = '';
            try {
                const ebehaviours = JSON.parse(entry.behaviours ?? '');
                if (ebehaviours) {
                    Object.entries(ebehaviours).forEach(([, value]) => {
                        if (typeof value === 'string') {
                            const b = mbehaviours.get(parseInt(value, 10));
                            if (b) {
                                behaviourStr += `${b.name}<br>`;
                            }
                        }
                    });
                }
            } catch {
                behaviourStr = '';
            }
            if (behaviourStr === '') {
                behaviourStr = 'not set<br>';
            }

            const tdbehRex = new Td2({value: behaviourStr});
            tdbehRex.appendTo(trbody);
            // eslint-disable-next-line no-new
            new ReactionDisplay(tdbehRex.getElement(), entry, mencates);

            const createDate = moment(entry.create_datetime * 1000);
            const updateDate = moment(entry.update_datetime * 1000);

            new Td2({
                value: `<b>${createDate.format('YYYY.MM.DD HH:mm:ss')}</b><br>${highlight(entry.creater_name, term)}<br>${updateDate.format('YYYY.MM.DD HH:mm:ss')}`
            }).appendTo(trbody);

            /*
             * Note column gets the search highlight too — small affordance so the user can
             * see *why* a row matched a free-text search.
             */
            if (term !== '' && entry.note) {
                trbody.getElement().attr('title', entry.note);
            }

            const tdAction = new Td2({value: ''});
            tdAction.appendTo(trbody);

            // Old (hand-imported) rows are read-only — no edit/delete menu.
            if (entry.is_old) {
                tdAction.append('<small class="text-muted"><i class="fas fa-lock"></i></small>');
                return;
            }

            const abtnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            abtnMenu.appendTo(tdAction);

            abtnMenu.addMenuItem('Edit', () => {
                const distanceCoast = parseFloat(entry.distance_coast!) || 0;

                this._sightingDialog.setTitle('Edit Sighting');
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
            }, IconFa.edit);

            abtnMenu.addDivider();

            /*
             * Per-vessel GFW breakdown — opens a small modal listing
             * each fishing vessel that was active in the 25 km buffer
             * on the sighting day. Empty list shows a "no fishing
             * vessels for this sighting" placeholder so the user can
             * tell "no activity" from "endpoint failed".
             */
            abtnMenu.addMenuItem('Fishing vessels', async() => {
                let vessels: SightingFishingVesselEntry[] = [];
                try {
                    vessels = await SightingFishingVesselAPI.getList([entry.id]);
                } catch (e) {
                    this._toast.fire({icon: 'error', title: (e as Error).message});
                    return;
                }

                const body = jQuery('<div/>');
                if (vessels.length === 0) {
                    body.html('<p class="text-muted">No fishing vessels recorded for this sighting (no activity, or GFW pull hasn\'t run yet).</p>');
                } else {
                    const lines: string[] = ['<table class="table table-sm table-striped">'];
                    lines.push('<thead><tr><th>Vessel</th><th>Flag</th><th>Gear</th><th class="text-right">Hours</th></tr></thead><tbody>');
                    for (const v of vessels) {
                        const name = v.name && v.name !== '' ? v.name : `<code class="small">${escapeHtml(v.vessel_id)}</code>`;
                        const mmsi = v.mmsi && v.mmsi !== '' ? `<br><small class="text-muted">MMSI ${escapeHtml(v.mmsi)}</small>` : '';
                        lines.push('<tr>'
                            + `<td>${name}${mmsi}</td>`
                            + `<td>${escapeHtml(v.flag ?? '—')}</td>`
                            + `<td>${escapeHtml(v.gear_type ?? '—')}</td>`
                            + `<td class="text-right">${v.hours.toFixed(2)}</td>`
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
            }, 'fa fa-ship');

            abtnMenu.addDivider();

            abtnMenu.addMenuItem('Delete', () => {
                this._sightingDeletedDialog.setTitle('Delete a sighting');
                this._sightingDeletedDialog.resetValues();
                this._sightingDeletedDialog.setSightingId(entry.id);
                this._sightingDeletedDialog.show();
            }, IconFa.trash);

            if (entry.files.length > 0) {
                tdAction.append('<br>');
                const btnAttachment = new ButtonMenu2({icon: IconFa.paperclip, positionRight: true});
                btnAttachment.appendTo(tdAction);

                for (const fname of entry.files) {
                    btnAttachment.addMenuItem(fname, () => {
                        const aImage = new Image();
                        aImage.src = `/json/sightings/getimage/${entry.id}/${fname}`;
                        aImage.style.width = '100%';

                        DialogInfo2.info(
                            'sightimage',
                            ModalDialogType2.xlarge,
                            `Image for Sighting #${entry.id}`,
                            // @ts-ignore
                            JQuery<HTMLImageElement>(aImage),
                            (_, modal) => modal.hide()
                        );
                    }, IconFa.camera);
                }
            }

            this._addSightingToMap(entry, mspecies);
        };

        // Hook the data source — TableWrapper drives infinite scroll itself ----------------------
        this._onLoadTable = async(): Promise<void> => {
            await tableWrapper.reset();
        };

        tableWrapper.setDataSource(
            async(page) => {
                card.showLoading();

                try {
                    const offset = page * PAGE_SIZE;
                    const response = await SightingsAPI.getList(buildApiFilter(offset, PAGE_SIZE));

                    if (!response) {
                        return [];
                    }

                    if (page === 0) {
                        // Reset only on first page so subsequent infinite-scroll pages add to existing markers.
                        if (this._map) {
                            this._map.clearFeatureList();
                        }
                        loadedCount = 0;
                        loadedEntries.length = 0;
                        dashboard.clear();
                        analytics.clear();
                        yearCompare.clear();
                        yearCompareLoaded = false;
                    }

                    for (const entry of response.list) {
                        loadedEntries.push(entry);
                    }

                    /*
                     * If the user already has the movements layer open,
                     * append tracks for the newly arrived page only —
                     * cheaper than re-fetching for the whole accumulated
                     * set on every infinite-scroll tick.
                     */
                    await appendMovementsForEntries(response.list);

                    totalCount = response.count;
                    loadedCount += response.list.length;
                    card.setTitle(`Sighting (${response.count})`);

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

        // Wire the in-header quick-search (debounced) -------------------------------------------
        let searchTimer: ReturnType<typeof setTimeout> | null = null;

        searchInput.getElement().on('keyup', () => {
            if (searchTimer !== null) {
                clearTimeout(searchTimer);
            }

            searchTimer = setTimeout(() => {
                const value = searchInput.getValue().trim();
                if (value === inHeaderSearch) {
                    return;
                }
                inHeaderSearch = value;
                tableWrapper.reset();
            }, 300);
        });

        // Wire filter Apply / Reset -------------------------------------------------------------
        filter.setOnApply((values) => {
            filterValues.period_from = values.period_from;
            filterValues.period_to = values.period_to;
            filterValues.species_id = values.species_id;
            filterValues.organization_id = values.organization_id;
            filterValues.vehicle_id = values.vehicle_id;
            filterValues.vehicle_driver_id = values.vehicle_driver_id;
            filterValues.search = values.search;
            filterValues.include_old = values.include_old;

            tableWrapper.reset();
        });
    }

    /**
     * Push one sighting onto the map (used both by the table renderer and the bulk
     * "load all" backfill). Silently ignores entries without a valid begin location.
     */
    protected _addSightingToMap(entry: SightingsEntry, mspecies: Map<number, SpeciesEntry>): void {
        if (!this._map) {
            return;
        }

        const bgeol = UtilLocation.strToGeolocationCoordinates(entry.location_begin!);
        if (!bgeol) {
            return;
        }

        const objectType = entry.pointtype ?? `${SightingMapObjectType.Testudines}`;

        this._map.addSighting(
            objectType,
            entry.unid!,
            () => {
                const div = jQuery('<div/>');
                // eslint-disable-next-line no-new
                new SpeciesDisplay(div, entry, mspecies, (speciesId) => {
                    PageLoader.getInstance().load(new SpeciesProfilePage(speciesId)).then();
                });
                return div;
            },
            UtilLocation.geoLocationToOlCoordinates(bgeol)
        );
    }

}