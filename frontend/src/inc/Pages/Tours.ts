import {
    Badge2,
    BadgeType2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    IconFa,
    Input2,
    InputType2,
    LangTextV2,
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
import {Organization as OrganizationAPI, OrganizationEntry} from '../Api/Organization';
import {TourEntry, Tours as ToursAPI, ToursCreater, ToursDevice, ToursFilter} from '../Api/Tours';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {Lang} from '../Lang';
import {Nav} from '../Nav';
import {BasePage} from './BasePage';
import {TourEditModal} from './Tours/TourEditModal';
import {TourFilter, TourFilterValues} from './Tours/TourFilter';
import {ToursMap} from './Tours/TourMap';
import {TOURS_PAGE_NAME} from './PageNames';

const PAGE_SIZE = 50;

type SortKey = 'id' | 'date' | 'tour_start' | 'tour_end' | 'create_datetime' | 'update_datetime';

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
 * Tours
 */
export class Tours extends BasePage {

    public static NAME: string = TOURS_PAGE_NAME;

    protected override _name: string = Tours.NAME;

    protected _tourDialog: TourEditModal;

    public constructor() {
        super();

        this._tourDialog = new TourEditModal();
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add tour', 'fas fa-plus', () => {
            this._tourDialog.setTitle(new LangTextV2({text: 'Add new tour'}));
            this._tourDialog.show();
        });

        // shared mutable state across loaders / renderers ----------------------------------------
        const sort: SortState = {
            id: SortOrder2.NONE,
            date: SortOrder2.DESC,
            tour_start: SortOrder2.DESC,
            tour_end: SortOrder2.NONE,
            create_datetime: SortOrder2.NONE,
            update_datetime: SortOrder2.NONE
        };

        const filterValues: TourFilterValues = {
            period_from: '',
            period_to: '',
            organization_id: 0,
            vehicle_id: 0,
            vehicle_driver_id: 0,
            search: '',
            only_without_tracks: false
        };

        let inHeaderSearch = '';
        const activeHighlight = (): string => inHeaderSearch === '' ? filterValues.search : inHeaderSearch;

        // Lookup maps populated once on first load and reused by the row renderer.
        const mvehicles = new Map<number, VehicleEntry>();
        const mdrivers = new Map<number, VehicleDriverEntry>();
        const morganizations = new Map<number, OrganizationEntry>();
        const mdevices = new Map<number, ToursDevice>();
        const mcreaters = new Map<number, ToursCreater>();

        // Build the filter payload sent to the backend; drop empties.
        const buildApiFilter = (offset: number, limit: number): ToursFilter => {
            const apiFilter: ToursFilter = {
                order: {
                    id: sort.id,
                    date: sort.date,
                    tour_start: sort.tour_start,
                    tour_end: sort.tour_end,
                    create_datetime: sort.create_datetime,
                    update_datetime: sort.update_datetime,
                    /*
                     * schema fields kept empty — server-side sort by computed
                     * counts is not implemented (counts are post-query batched)
                     */
                    count_sightings: '',
                    count_trackings: ''
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
            if (filterValues.organization_id > 0) {
                apiFilter.organization_id = filterValues.organization_id;
            }
            if (filterValues.vehicle_id > 0) {
                apiFilter.vehicle_id = filterValues.vehicle_id;
            }
            if (filterValues.vehicle_driver_id > 0) {
                apiFilter.vehicle_driver_id = filterValues.vehicle_driver_id;
            }
            if (filterValues.only_without_tracks) {
                apiFilter.only_without_tracks = true;
            }

            const search = inHeaderSearch === '' ? filterValues.search : inHeaderSearch;
            if (search !== '') {
                apiFilter.search = search;
            }

            return apiFilter;
        };

        // Filter card ---------------------------------------------------------------------------
        const content = this._wrapper.getContentWrapper().getContent();
        const rowFilter = new ContentRow2(content.getContentFluidElement());
        const filter = new TourFilter();
        filter.appendTo(new ContentCol2(rowFilter, ContentColSize2.col12).getElement());

        // Lookup maps + initial loads -----------------------------------------------------------
        const [
            vehicles,
            drivers,
            organizations
        ] = await Promise.all([
            VehicleAPI.getList(),
            VehicleDriverAPI.getList(),
            OrganizationAPI.getOrganizationByUser()
        ]);

        if (vehicles) {
            for (const v of vehicles) {
                mvehicles.set(v.id, v);
            }
            const activeVehicles = vehicles.filter((v) => v.in_use && !v.isdeleted);
            filter.setVehicleList(activeVehicles);
        }

        if (drivers) {
            for (const d of drivers) {
                mdrivers.set(d.id, d);
            }
            filter.setDriverList(drivers);
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
        card.setTitle(new LangTextV2({text: 'Tours'}));

        const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
        btnMenu.appendTo(card.getToolsElement());
        btnMenu.addMenuItem(new LangTextV2({text: 'Filter'}), () => {
            filter.show();
        }, 'fa fa-filter');

        /*
         * In-header quick-search — sibling of .card-title in the card-header so AdminLTE's
         * float layout puts it directly right of the title.
         */
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());

        const searchInput = new Input2({type: InputType2.text});
        searchInput.appendTo(searchSlot);
        searchInput.setPlaceholder(Lang.i().l('search persons / tour-fid …'));

        // Table ---------------------------------------------------------------------------------
        const tableWrapper = new TableWrapper2<TourEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
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

        const thIdDate = new Th2({});
        thIdDate.addComponent(makeSortColumn('Id', 'id'));
        thIdDate.append('<br>');
        thIdDate.addComponent(makeSortColumn('Date', 'date'));
        thIdDate.appendTo(trhead);

        const thVehicle = new Th2({});
        thVehicle.addComponent(new LangTextV2({text: 'Vehicle'}));
        thVehicle.append('<br>');
        thVehicle.addComponent(new LangTextV2({text: 'Driver'}));
        thVehicle.append('<br>');
        thVehicle.addComponent(new LangTextV2({text: 'Organization'}));
        thVehicle.appendTo(trhead);

        const thTime = new Th2({});
        thTime.addComponent(makeSortColumn('Time begin-end', 'tour_start'));
        thTime.append('<br>');
        thTime.addComponent(new LangTextV2({text: 'Sightings'}));
        thTime.appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Tracking points'})}).appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Persons on boat'})}).appendTo(trhead);

        const thCreated = new Th2({});
        thCreated.addComponent(new LangTextV2({text: 'from Device'}));
        thCreated.append('<br>');
        thCreated.addComponent(new LangTextV2({text: 'Created by'}));
        thCreated.append('<br>');
        thCreated.addComponent(makeSortColumn('Created', 'create_datetime'));
        thCreated.appendTo(trhead);

        new Th2({value: ''}).appendTo(trhead);

        // Renderer ------------------------------------------------------------------------------
        const renderRow = (_table: Table2, entry: TourEntry): void => {
            const term = activeHighlight();
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());

            const date = moment(entry.date?.split(' ')[0]);

            new Td2({value: `<b>#${entry.id}</b><br>${date.format('YYYY.MM.DD')}`}).appendTo(trbody);

            const vehicleName = mvehicles.get(entry.vehicle_id)?.name ?? '';
            const driverName = mdrivers.get(entry.vehicle_driver_id)?.user.name ?? '';
            const orgStr = entry.organization_id ? morganizations.get(entry.organization_id)?.description ?? '' : '';

            new Td2({
                value: `${escapeHtml(vehicleName)}<br>${escapeHtml(driverName)}<br>${escapeHtml(orgStr)}`
            }).appendTo(trbody);

            const tdTimeCount = new Td2({value: `<b>${escapeHtml(entry.tour_start ?? '')} - ${escapeHtml(entry.tour_end ?? '')}</b><br>`});
            tdTimeCount.appendTo(trbody);
            new Badge2({
                text: `${entry.count_sightings}`,
                type: entry.count_sightings > 0 ? BadgeType2.success : BadgeType2.secondary
            }).appendTo(tdTimeCount);

            const tdTrackingCount = new Td2({value: ''});
            tdTrackingCount.appendTo(trbody);

            if (entry.count_trackings > 0) {
                const badgeTracking = new Badge2({text: `${entry.count_trackings}`, type: BadgeType2.info});
                badgeTracking.appendTo(tdTrackingCount);
                badgeTracking.getElement().on('click', () => {
                    Nav.load(new ToursMap(entry.id)).then();
                });
                badgeTracking.getElement().css({cursor: 'pointer'});
            } else {
                tdTrackingCount.addValue(`${entry.count_trackings}`);
            }

            /*
             * Persons on boat — JSON list, render as comma-separated names. Search highlight
             * applies so the in-header search clearly tells the user *why* a row matched.
             */
            let personsStr = '';
            try {
                const persons = JSON.parse(entry.record_by_persons ?? '');
                if (Array.isArray(persons)) {
                    personsStr = persons.map((p) => typeof p === 'string' ? p : '').filter((p) => p !== '').join(', ');
                } else if (persons && typeof persons === 'object') {
                    personsStr = Object.values(persons).map((p) => typeof p === 'string' ? p : '').filter((p) => p !== '').join(', ');
                }
            } catch {
                personsStr = entry.record_by_persons ?? '';
            }

            new Td2({value: highlight(personsStr, term)}).appendTo(trbody);

            const deviceName = mdevices.get(entry.device_id)?.name ?? 'not set';
            const createrName = mcreaters.get(entry.creater_id)?.name ?? 'not set';
            const createDate = moment(entry.create_datetime * 1000);

            new Td2({
                value: `${escapeHtml(deviceName)}<br>${escapeHtml(createrName)}<br><b>${createDate.format('YYYY.MM.DD HH:mm:ss')}</b>`
            }).appendTo(trbody);

            const tdAction = new Td2({value: ''});
            tdAction.appendTo(trbody);
            const abtnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            abtnMenu.appendTo(tdAction);

            abtnMenu.addMenuItem(Lang.i().l('Show Map'), () => {
                Nav.load(new ToursMap(entry.id)).then();
            }, IconFa.hockeypuck);

            abtnMenu.addMenuItem(Lang.i().l('Delete'), () => {
                // eslint-disable-next-line no-alert
                window.alert('Delete todo');
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
                    const offset = page * PAGE_SIZE;
                    const response = await ToursAPI.getList(buildApiFilter(offset, PAGE_SIZE));

                    if (!response || !response.list) {
                        return [];
                    }

                    if (response.devices) {
                        for (const d of response.devices) {
                            mdevices.set(d.id, d);
                        }
                    }
                    if (response.creaters) {
                        for (const c of response.creaters) {
                            mcreaters.set(c.id, c);
                        }
                    }

                    const count = response.count ?? 0;
                    card.setTitle(`${Lang.i().l('Tours')} (${count})`);

                    return response.list;
                } finally {
                    card.hideLoading();
                    Lang.i().lAll();
                    Tooltip2.init();
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
            filterValues.organization_id = values.organization_id;
            filterValues.vehicle_id = values.vehicle_id;
            filterValues.vehicle_driver_id = values.vehicle_driver_id;
            filterValues.search = values.search;

            tableWrapper.reset();
        });
    }

}