import {
    Badge,
    BadgeType,
    ButtonMenu,
    ButtonType,
    Card,
    ColumnContent,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    LeftNavbarLink,
    SortingColumn,
    SortOrder,
    TableWrapper,
    Td,
    Th,
    Tooltip,
    Tr
} from 'bambooo';
import moment from 'moment';
import {Organization as OrganizationAPI, OrganizationEntry} from '../Api/Organization';
import {TourEntry, Tours as ToursAPI, ToursCreater, ToursDevice, ToursFilter} from '../Api/Tours';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {TourEditModal} from './Tours/TourEditModal';
import {TourFilter, TourFilterValues} from './Tours/TourFilter';
import {ToursMap} from './Tours/TourMap';

const PAGE_SIZE = 50;

type SortKey = 'id' | 'date' | 'tour_start' | 'tour_end' | 'create_datetime' | 'update_datetime';

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

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${escapedTerm})`, 'gi'), '<mark>$1</mark>');
};

/**
 * Tours
 */
export class Tours extends BasePage {

    public static NAME: string = 'tours';

    protected override _name: string = Tours.NAME;

    protected _tourDialog: TourEditModal;

    public constructor() {
        super();

        this._tourDialog = new TourEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), new LangText('Add tour'), () => {
            this._tourDialog.setTitle(new LangText('Add new tour'));
            this._tourDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        // shared mutable state across loaders / renderers ----------------------------------------
        const sort: SortState = {
            id: SortOrder.NONE,
            date: SortOrder.DESC,
            tour_start: SortOrder.DESC,
            tour_end: SortOrder.NONE,
            create_datetime: SortOrder.NONE,
            update_datetime: SortOrder.NONE
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
        const activeHighlight = (): string => inHeaderSearch !== '' ? inHeaderSearch : filterValues.search;

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
                    // schema fields kept empty — server-side sort by computed
                    // counts is not implemented (counts are post-query batched)
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

            const search = inHeaderSearch !== '' ? inHeaderSearch : filterValues.search;
            if (search !== '') {
                apiFilter.search = search;
            }

            return apiFilter;
        };

        // Filter card ---------------------------------------------------------------------------
        const rowFilter = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const filter = new TourFilter(new ContentCol(rowFilter, ContentColSize.col12));

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
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Tours'));

        const btnMenu = new ButtonMenu(card.getToolsElement(), IconFa.bars, true, ButtonType.borderless);
        btnMenu.addMenuItem(new LangText('Filter'), () => {
            filter.show();
        }, 'fa fa-filter');

        // In-header quick-search — sibling of .card-title in the card-header so AdminLTE's
        // float layout puts it directly right of the title.
        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());

        const searchInput = new InputBottemBorderOnly2(searchSlot, undefined, InputType.text);
        searchInput.setPlaceholder('search persons / tour-fid …');

        // Table ---------------------------------------------------------------------------------
        const tableWrapper = new TableWrapper<TourEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // Sort registry: each call wires a header to its key in `sort` and ensures clicking it
        // resets every other header (single-column sort).
        const sortRegistry: { key: SortKey; column: LangText }[] = [];

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
        new Th(trhead, new ColumnContent([
            makeSortColumn('Id', 'id'),
            makeSortColumn('Date', 'date')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Vehicle'),
            new LangText('Driver'),
            new LangText('Organization')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            makeSortColumn('Time begin-end', 'tour_start'),
            new LangText('Sightings')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Tracking points'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Persons on boat'));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('from Device'),
            new LangText('Created by'),
            makeSortColumn('Created', 'create_datetime')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        // Renderer ------------------------------------------------------------------------------
        const renderRow = (_table: import('bambooo').Table, entry: TourEntry): void => {
            const term = activeHighlight();
            const trbody = new Tr(table.getTbody());

            const date = moment(entry.date?.split(' ')[0]);

            // eslint-disable-next-line no-new
            new Td(trbody, `<b>#${entry.id}</b><br>${date.format('YYYY.MM.DD')}`);

            const vehicleName = mvehicles.get(entry.vehicle_id)?.name ?? '';
            const driverName = mdrivers.get(entry.vehicle_driver_id)?.user.name ?? '';
            const orgStr = entry.organization_id ? (morganizations.get(entry.organization_id)?.description ?? '') : '';

            // eslint-disable-next-line no-new
            new Td(trbody, `${escapeHtml(vehicleName)}<br>${escapeHtml(driverName)}<br>${escapeHtml(orgStr)}`);

            const tdTimeCount = new Td(trbody, `<b>${escapeHtml(entry.tour_start ?? '')} - ${escapeHtml(entry.tour_end ?? '')}</b><br>`);
            // eslint-disable-next-line no-new
            new Badge(
                tdTimeCount,
                `${entry.count_sightings}`,
                entry.count_sightings > 0 ? BadgeType.success : BadgeType.secondary
            );

            const tdTrackingCount = new Td(trbody, '');

            if (entry.count_trackings > 0) {
                const badgeTracking = new Badge(tdTrackingCount, `${entry.count_trackings}`, BadgeType.info);
                badgeTracking.getElement().on('click', () => {
                    if (this._loadPageFn) {
                        this._loadPageFn(new ToursMap(entry.id));
                    }
                });
                badgeTracking.getElement().css({cursor: 'pointer'});
            } else {
                tdTrackingCount.addValue(`${entry.count_trackings}`);
            }

            // Persons on boat — JSON list, render as comma-separated names. Search highlight
            // applies so the in-header search clearly tells the user *why* a row matched.
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
            // eslint-disable-next-line no-new
            new Td(trbody, highlight(personsStr, term));

            const deviceName = mdevices.get(entry.device_id)?.name ?? 'not set';
            const createrName = mcreaters.get(entry.creater_id)?.name ?? 'not set';
            const createDate = moment(entry.create_datetime * 1000);

            // eslint-disable-next-line no-new
            new Td(trbody, `${escapeHtml(deviceName)}<br>${escapeHtml(createrName)}<br><b>${createDate.format('YYYY.MM.DD HH:mm:ss')}</b>`);

            const tdAction = new Td(trbody, '');
            const abtnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

            abtnMenu.addMenuItem('Show Map', () => {
                if (this._loadPageFn) {
                    this._loadPageFn(new ToursMap(entry.id));
                }
            }, IconFa.hockeypuck);

            abtnMenu.addMenuItem('Delete', () => {
                alert('Delete todo');
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
                    card.setTitle(`Tours (${count})`);

                    return response.list;
                } finally {
                    card.hideLoading();
                    Lang.i().lAll();
                    Tooltip.init();
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