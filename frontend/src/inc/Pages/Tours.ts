/* global JQuery */
import {
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
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
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';
import {TOURS_PAGE_NAME} from './PageNames';
import {ToursMap} from './Tours/TourMap';

type SortKey = 'id' | 'date' | 'tour_start' | 'tour_end' | 'create_datetime' | 'update_datetime';

type SortState = Record<SortKey, SortOrder2>;

/**
 * Filter of the toolbar; empty / 0 = no filter.
 */
type TourListFilter = {
    period: string;
    organization_id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    search: string;
    only_without_tracks: boolean;
};

/**
 * Tours
 *
 * Tour list: toolbar (search, period, organisation, boat, skipper, only
 * tours without track), one row per tour with date, boat & crew, times,
 * sightings, track points and source, and a direct map button.
 */
export class Tours extends BasePage {

    public static NAME: string = TOURS_PAGE_NAME;

    protected static readonly _PAGE_SIZE = 50;

    protected override _name: string = Tours.NAME;

    /**
     * Period presets → [from, to] (YYYY-MM-DD).
     * @param {string} period
     * @return {[string, string]}
     */
    protected static _period(period: string): [string, string] {
        const f = 'YYYY-MM-DD';
        const today = moment();

        switch (period) {
            case 'current_year':
                return [today.clone().startOf('year').format(f), today.clone().endOf('year').format(f)];

            case 'last_year': {
                const last = today.clone().subtract(1, 'year');
                return [last.clone().startOf('year').format(f), last.clone().endOf('year').format(f)];
            }

            case 'last_30_days':
                return [today.clone().subtract(30, 'days').format(f), today.format(f)];

            case 'last_90_days':
                return [today.clone().subtract(90, 'days').format(f), today.format(f)];

            case 'last_365_days':
                return [today.clone().subtract(365, 'days').format(f), today.format(f)];

            default:
                return ['', ''];
        }
    }

    /**
     * Minutes of "HH:mm", null when empty / invalid.
     * @param {string} value
     * @return {number|null}
     */
    protected static _minutes(value: string): number | null {
        const match = (/^(\d{1,2}):(\d{2})/u).exec(value.trim());
        return match ? (parseInt(match[1], 10) * 60) + parseInt(match[2], 10) : null;
    }

    /**
     * Device name without the Flutter build suffix
     * ("RT1 - Instance of 'AndroidBuildVersion'" → "RT1").
     * @param {string} name
     * @return {string}
     */
    protected static _deviceName(name: string): string {
        return name.replace(/\s*-\s*Instance of '[^']*'\s*$/u, '').trim();
    }

    /**
     * Names of the persons on board (JSON list / map, or plain text).
     * @param {string} raw
     * @return {string[]}
     */
    protected static _persons(raw: string): string[] {
        const text = raw.trim();

        if (text === '') {
            return [];
        }

        try {
            const data = JSON.parse(text) as unknown;

            if (data !== null && typeof data === 'object') {
                return Object.values(data as Record<string, unknown>)
                .filter((p): p is string => typeof p === 'string' && p.trim() !== '');
            }
        } catch {
            // plain text
        }

        return [text];
    }

    /**
     * Small icon line under a cell's main text.
     * @param {JQuery} parent
     * @param {string} icon
     * @param {string} html already escaped
     * @param {string} [title] English source text
     * @return {JQuery}
     */
    protected static _subline(parent: JQuery, icon: string, html: string, title?: string): JQuery {
        const line = jQuery('<div class="small text-body-secondary text-nowrap"/>').appendTo(parent);
        jQuery('<i class="fa-fw me-1 opacity-75"/>').addClass(icon).appendTo(line);
        jQuery('<span/>').html(html).appendTo(line);

        if (title) {
            line.attr('title', Lang.i().l(title));
        }

        return line;
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const lang = Lang.i();
        const esc = (s: string): string => AdminListUi.escape(s);

        const sort: SortState = {
            id: SortOrder2.NONE,
            date: SortOrder2.DESC,
            tour_start: SortOrder2.DESC,
            tour_end: SortOrder2.NONE,
            create_datetime: SortOrder2.NONE,
            update_datetime: SortOrder2.NONE
        };

        const filter: TourListFilter = {
            period: '',
            organization_id: 0,
            vehicle_id: 0,
            vehicle_driver_id: 0,
            search: '',
            only_without_tracks: false
        };

        const mvehicles = new Map<number, VehicleEntry>();
        const mdrivers = new Map<number, VehicleDriverEntry>();
        const morganizations = new Map<number, OrganizationEntry>();
        const mdevices = new Map<number, ToursDevice>();
        const mcreaters = new Map<number, ToursCreater>();

        const buildApiFilter = (offset: number, limit: number): ToursFilter => {
            const apiFilter: ToursFilter = {
                order: {
                    id: sort.id,
                    date: sort.date,
                    tour_start: sort.tour_start,
                    tour_end: sort.tour_end,
                    create_datetime: sort.create_datetime,
                    update_datetime: sort.update_datetime,
                    // counts are batched after the query, no server-side sort
                    count_sightings: '',
                    count_trackings: ''
                },
                limit,
                offset
            };

            const [from, to] = Tours._period(filter.period);

            if (from !== '') {
                apiFilter.period_from = from;
                apiFilter.period_to = to;
            }

            if (filter.organization_id > 0) {
                apiFilter.organization_id = filter.organization_id;
            }

            if (filter.vehicle_id > 0) {
                apiFilter.vehicle_id = filter.vehicle_id;
            }

            if (filter.vehicle_driver_id > 0) {
                apiFilter.vehicle_driver_id = filter.vehicle_driver_id;
            }

            if (filter.only_without_tracks) {
                apiFilter.only_without_tracks = true;
            }

            if (filter.search !== '') {
                apiFilter.search = filter.search;
            }

            return apiFilter;
        };

        // lookups -------------------------------------------------------------------------------
        const [vehicles, drivers, organizations] = await Promise.all([
            VehicleAPI.getList(true),
            VehicleDriverAPI.getList(true),
            OrganizationAPI.getOrganizationByUser(true)
        ]);

        for (const v of vehicles ?? []) {
            mvehicles.set(v.id, v);
        }

        for (const d of drivers ?? []) {
            mdrivers.set(d.id, d);
        }

        for (const o of organizations ?? []) {
            morganizations.set(o.id, o);
        }

        // card + toolbar ------------------------------------------------------------------------
        const content = this._wrapper.getContentWrapper().getContent();
        const row = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Tours'}));

        const reload = (): void => {
            this._onLoadTable?.();
        };

        const toolbar = AdminListUi.toolbar(card.getElement());
        toolbar.addClass('pb-3');

        AdminListUi.search(toolbar, 'search persons / tour-fid …', (term): void => {
            filter.search = term;
            reload();
        });

        const periodSelect = AdminListUi.select(toolbar, 'Whole period', (value): void => {
            filter.period = value === '0' ? '' : value;
            reload();
        });

        AdminListUi.setOptions(periodSelect, [
            {value: 'current_year', label: lang.l('Current year')},
            {value: 'last_year', label: lang.l('Last year')},
            {value: 'last_30_days', label: lang.l('Last 30 days')},
            {value: 'last_90_days', label: lang.l('Last 90 days')},
            {value: 'last_365_days', label: lang.l('Last 365 days')}
        ]);

        if (morganizations.size > 1) {
            const organizationSelect = AdminListUi.select(toolbar, 'All organizations', (value): void => {
                filter.organization_id = parseInt(value, 10) || 0;
                reload();
            });

            AdminListUi.setOptions(organizationSelect, [...morganizations.values()]
            .map((o) => ({value: `${o.id}`, label: o.description}))
            .sort((a, b) => a.label.localeCompare(b.label)));
        }

        const vehicleSelect = AdminListUi.select(toolbar, 'All vehicles', (value): void => {
            filter.vehicle_id = parseInt(value, 10) || 0;
            reload();
        });

        AdminListUi.setOptions(vehicleSelect, [...mvehicles.values()]
        .filter((v) => v.in_use && !v.isdeleted)
        .map((v) => ({value: `${v.id}`, label: v.name}))
        .sort((a, b) => a.label.localeCompare(b.label)));

        const driverSelect = AdminListUi.select(toolbar, 'All skippers', (value): void => {
            filter.vehicle_driver_id = parseInt(value, 10) || 0;
            reload();
        });

        AdminListUi.setOptions(driverSelect, [...mdrivers.values()]
        .map((d) => ({value: `${d.id}`, label: d.user.name}))
        .sort((a, b) => a.label.localeCompare(b.label)));

        AdminListUi.switch(toolbar, `mwpa-tours-without-track-${Date.now()}`, 'Only without track', (checked): void => {
            filter.only_without_tracks = checked;
            reload();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);

        // table ---------------------------------------------------------------------------------
        const tableWrapper = new TableWrapper2<TourEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No tours match the current filter.');

        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        // single-column sort: clicking a header resets the others
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
                    reload();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});

            return column;
        };

        const thTour = new Th2({});
        thTour.addComponent(makeSortColumn('Date', 'date'));
        thTour.append('<span class="text-body-tertiary fw-normal"> · </span>');
        thTour.addComponent(makeSortColumn('ID', 'id'));
        thTour.appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Boat & crew'})}).appendTo(trhead);

        const thTime = new Th2({});
        thTime.addComponent(makeSortColumn('Time', 'tour_start'));
        thTime.appendTo(trhead);

        new Th2({value: new LangTextV2({text: 'Sightings'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Track'})}).appendTo(trhead);

        const thSource = new Th2({});
        thSource.addComponent(makeSortColumn('Created', 'create_datetime'));
        thSource.appendTo(trhead);

        new Th2({value: ''}).appendTo(trhead);

        const openMap = (entry: TourEntry): void => {
            Nav.load(new ToursMap(entry.id)).then();
        };

        // renderer ------------------------------------------------------------------------------
        const renderRow = (_table: Table2, entry: TourEntry): void => {
            const term = filter.search;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            // date + id + tour fid
            const tdTour = new Td2({value: ''});
            tdTour.appendTo(tr);
            const date = moment(entry.date.split(' ')[0]);
            AdminListUi.nameLink(tdTour.getElement(), esc(date.isValid() ? date.format('YYYY.MM.DD') : entry.date), (): void => openMap(entry));
            const idLine = jQuery('<div class="small"/>').appendTo(tdTour.getElement());
            jQuery('<span class="font-monospace text-body-secondary"/>').text(`#${entry.id}`).appendTo(idLine);

            if (entry.tour_fid !== '') {
                jQuery('<div class="small text-body-tertiary font-monospace text-truncate" style="max-width:16rem;"/>')
                .html(AdminListUi.highlight(entry.tour_fid, term))
                .attr('title', entry.tour_fid)
                .appendTo(tdTour.getElement());
            }

            // boat & crew
            const tdCrew = new Td2({value: ''});
            tdCrew.appendTo(tr);
            const vehicle = mvehicles.get(entry.vehicle_id);
            const crewMain = jQuery('<div class="fw-semibold text-nowrap"/>').appendTo(tdCrew.getElement());
            jQuery('<i class="fas fa-ship fa-fw me-1 text-body-secondary"/>').appendTo(crewMain);
            jQuery('<span/>').text(vehicle?.name ?? `#${entry.vehicle_id}`).appendTo(crewMain);

            const driver = mdrivers.get(entry.vehicle_driver_id);

            if (driver) {
                Tours._subline(tdCrew.getElement(), 'fas fa-user-tie', esc(driver.user.name), 'Skipper');
            }

            const organization = morganizations.get(entry.organization_id);

            if (organization && morganizations.size > 1) {
                Tours._subline(tdCrew.getElement(), 'far fa-building', esc(organization.description), 'Organization');
            }

            const persons = Tours._persons(entry.record_by_persons);

            if (persons.length > 0) {
                Tours._subline(tdCrew.getElement(), 'fas fa-users', AdminListUi.highlight(persons.join(', '), term), 'Persons on boat')
                .removeClass('text-nowrap');
            }

            // time
            const tdTime = new Td2({value: ''});
            tdTime.appendTo(tr);
            const start = Tours._minutes(entry.tour_start);
            const end = Tours._minutes(entry.tour_end);
            const timeMain = jQuery('<div class="text-nowrap"/>').appendTo(tdTime.getElement());
            if (entry.tour_start.trim() === '' && entry.tour_end.trim() === '') {
                jQuery('<span class="text-body-tertiary small"/>').text(lang.l('no times')).appendTo(timeMain);
            } else {
                jQuery('<span class="fw-semibold"/>').text(`${entry.tour_start || '…'} – ${entry.tour_end || '…'}`).appendTo(timeMain);
            }

            if (start !== null && end !== null && end >= start) {
                const minutes = end - start;
                Tours._subline(tdTime.getElement(), 'far fa-clock', esc(`${Math.floor(minutes / 60)} h ${`${minutes % 60}`.padStart(2, '0')} min`), 'Duration');
            } else if (start !== null && end !== null) {
                AdminListUi.pill(jQuery('<div class="mt-1"/>').appendTo(tdTime.getElement()), 'End before start', 'warning', 'fas fa-exclamation-triangle');
            }

            if (entry.beaufort_wind.trim() !== '') {
                Tours._subline(tdTime.getElement(), 'fas fa-wind', esc(`${entry.beaufort_wind} Bft`), 'Wind/Seastate (Beaufort)');
            }

            // sightings
            const tdSightings = new Td2({value: ''});
            tdSightings.appendTo(tr);

            if (entry.count_sightings > 0) {
                AdminListUi.pill(tdSightings.getElement(), `${entry.count_sightings}`, 'primary', 'fas fa-binoculars')
                .attr('title', lang.l('Sightings'));
            } else {
                jQuery('<span class="text-body-tertiary small"/>').text(lang.l('none')).appendTo(tdSightings.getElement());
            }

            // track
            const tdTrack = new Td2({value: ''});
            tdTrack.appendTo(tr);

            if (entry.count_trackings > 0) {
                AdminListUi.pill(tdTrack.getElement(), entry.count_trackings.toLocaleString(), 'success', 'fas fa-route')
                .attr('title', lang.l('Tracking points'))
                .css('cursor', 'pointer')
                .on('click', (): void => openMap(entry));
            } else {
                jQuery('<span class="text-body-tertiary small"/>').text(lang.l('no track')).appendTo(tdTrack.getElement());
            }

            // created / source
            const tdSource = new Td2({value: ''});
            tdSource.appendTo(tr);
            jQuery('<div class="small text-nowrap"/>').text(moment(entry.create_datetime * 1000).format('YYYY.MM.DD HH:mm')).appendTo(tdSource.getElement());

            const creater = mcreaters.get(entry.creater_id);

            if (creater) {
                Tours._subline(tdSource.getElement(), 'fas fa-user-edit', esc(creater.name), 'Created by');
            }

            const device = mdevices.get(entry.device_id);

            if (entry.device_id === 0) {
                Tours._subline(tdSource.getElement(), 'fas fa-globe', esc(lang.l('Web')), 'Source');
            } else if (device) {
                Tours._subline(tdSource.getElement(), 'fas fa-mobile-alt', esc(Tours._deviceName(device.name)), 'from Device')
                .attr('title', device.name);
            }

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);
            const actions = jQuery('<div class="d-flex justify-content-end"/>').appendTo(tdAction.getElement());
            const btnMap = jQuery('<button type="button" class="btn btn-sm btn-outline-primary text-nowrap"/>')
            .attr('title', lang.l('Show Map'))
            .appendTo(actions);
            jQuery('<i class="fas fa-map-marked-alt"/>').appendTo(btnMap);
            btnMap.on('click', (): void => openMap(entry));
        };

        // data source (infinite scroll) ---------------------------------------------------------
        let loaded = 0;

        this._onLoadTable = async(): Promise<void> => {
            await tableWrapper.reset();
        };

        tableWrapper.setDataSource(
            async(page) => {
                card.showLoading();

                try {
                    const response = await ToursAPI.getList(buildApiFilter(page * Tours._PAGE_SIZE, Tours._PAGE_SIZE));

                    if (!response || !response.list) {
                        return [];
                    }

                    for (const d of response.devices ?? []) {
                        mdevices.set(d.id, d);
                    }

                    for (const c of response.creaters ?? []) {
                        mcreaters.set(c.id, c);
                    }

                    const count = response.count ?? 0;

                    loaded = page === 0 ? response.list.length : loaded + response.list.length;
                    card.setTitle(`${lang.l('Tours')} (${count})`);
                    AdminListUi.setResult(resultInfo, loaded, count);
                    AdminListUi.setEmpty(emptyInfo, count === 0);

                    return response.list;
                } finally {
                    card.hideLoading();
                    Lang.i().lAll();
                    Tooltip2.init();
                }
            },
            renderRow
        );
    }

}