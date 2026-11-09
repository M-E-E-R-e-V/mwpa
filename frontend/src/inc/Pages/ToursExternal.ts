/* global JQuery */
import {
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    LangTextV2,
    Table2,
    TableWrapper2,
    Td2,
    Tooltip2,
    Tr2
} from 'bambooo';
import moment from 'moment';
import {ExternalTour as ExternalTourAPI, ExternalTourEntry} from '../Api/ExternalTour';
import {Organization as OrganizationAPI, OrganizationEntry} from '../Api/Organization';
import {Lang} from '../Lang';
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';

/**
 * Toolbar filter; empty = no filter.
 */
type ExternalTourFilter = {
    period: string;
    organization_id: number;
    item: string;
    status: string;
    search: string;
};

/**
 * Columns that are only shown when at least one slot has data for them.
 */
type ExternalTourColumns = {
    organization: boolean;
    meeting: boolean;
    prices: boolean;
};

/**
 * ToursExternal
 *
 * Read-only view of the tour slots pulled from booking providers
 * (FareHarbor today): summary figures, toolbar (search, period, tour,
 * status, organisation) and the slots grouped by day. The window is the
 * one the pull uses (now → now + 60 days). Non-admins are scoped to
 * their organisations server-side.
 */
export class ToursExternal extends BasePage {

    public static NAME: string = 'tours-external';

    protected static readonly _PAGE_SIZE = 100;

    protected override _name: string = ToursExternal.NAME;

    /**
     * Status key of a slot.
     * @param {ExternalTourEntry} entry
     * @return {string}
     */
    protected static _status(entry: ExternalTourEntry): 'sold_out' | 'bookable' | 'closed' {
        if (entry.is_sold_out) {
            return 'sold_out';
        }

        return entry.is_bookable ? 'bookable' : 'closed';
    }

    /**
     * Item key of a slot (pk, or the name for rows without a pk).
     * @param {ExternalTourEntry} entry
     * @return {string}
     */
    protected static _itemKey(entry: ExternalTourEntry): string {
        return entry.item_pk !== '' && entry.item_pk !== 'undefined' ? entry.item_pk : `name:${entry.item_name}`;
    }

    /**
     * Price in cents as text, '' when missing.
     * @param {number} cents
     * @param {string} currency
     * @return {string}
     */
    protected static _price(cents: number, currency: string): string {
        if (!Number.isFinite(cents) || cents <= 0) {
            return '';
        }

        try {
            return (cents / 100).toLocaleString(undefined, {style: 'currency', currency: currency || 'EUR'});
        } catch {
            return `${(cents / 100).toFixed(2)} ${currency}`;
        }
    }

    /**
     * Upper bound (unix seconds) of a period preset, null = whole window.
     * @param {string} period
     * @return {number|null}
     */
    protected static _periodEnd(period: string): number | null {
        const now = moment();

        switch (period) {
            case 'today':
                return now.clone().endOf('day').unix();

            case 'next_7_days':
                return now.clone().add(7, 'days').endOf('day').unix();

            case 'next_30_days':
                return now.clone().add(30, 'days').endOf('day').unix();

            default:
                return null;
        }
    }

    /**
     * Day heading ("Today · Tue, 10.11.2026").
     * @param {moment.Moment} day local wall-clock as UTC moment
     * @return {string}
     */
    protected static _dayLabel(day: moment.Moment): string {
        const lang = Lang.i();
        const text = day.toDate().toLocaleDateString(undefined, {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
        });
        const key = day.format('YYYY-MM-DD');
        const today = moment().format('YYYY-MM-DD');
        const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');

        if (key === today) {
            return `${lang.l('Today')} · ${text}`;
        }

        if (key === tomorrow) {
            return `${lang.l('Tomorrow')} · ${text}`;
        }

        return text;
    }

    /**
     * Small icon line under a cell's main text.
     * @param {JQuery} parent
     * @param {string} icon
     * @param {string} text plain text
     * @return {JQuery}
     */
    protected static _subline(parent: JQuery, icon: string, text: string): JQuery {
        const line = jQuery('<div class="small text-body-secondary text-nowrap"/>').appendTo(parent);
        jQuery('<i class="fa-fw me-1 opacity-75"/>').addClass(icon).appendTo(line);
        jQuery('<span/>').text(text).appendTo(line);
        return line;
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const lang = Lang.i();

        const filter: ExternalTourFilter = {
            period: '',
            organization_id: 0,
            item: '',
            status: '',
            search: ''
        };

        let allTours: ExternalTourEntry[] = [];
        let shown: ExternalTourEntry[] = [];
        const morganizations = new Map<number, OrganizationEntry>();
        const columns: ExternalTourColumns = {organization: false, meeting: false, prices: false};

        // card ----------------------------------------------------------------------------------
        const content = this._wrapper.getContentWrapper().getContent();
        const row = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Tours External'}));

        const stats = AdminListUi.statsRow(card.getElement());

        const reload = (): void => {
            this._onLoadTable?.();
        };

        const toolbar = AdminListUi.toolbar(card.getElement());
        toolbar.addClass('pb-3');

        AdminListUi.search(toolbar, 'search tour / meeting point …', (term): void => {
            filter.search = term;
            reload();
        });

        const periodSelect = AdminListUi.select(toolbar, 'Next 60 days', (value): void => {
            filter.period = value === '0' ? '' : value;
            reload();
        });

        AdminListUi.setOptions(periodSelect, [
            {value: 'today', label: lang.l('Today')},
            {value: 'next_7_days', label: lang.l('Next 7 days')},
            {value: 'next_30_days', label: lang.l('Next 30 days')}
        ]);

        const itemSelect = AdminListUi.select(toolbar, 'All tours', (value): void => {
            filter.item = value === '0' ? '' : value;
            reload();
        });

        const statusSelect = AdminListUi.select(toolbar, 'All statuses', (value): void => {
            filter.status = value === '0' ? '' : value;
            reload();
        });

        AdminListUi.setOptions(statusSelect, [
            {value: 'bookable', label: lang.l('Bookable')},
            {value: 'sold_out', label: lang.l('Sold out')},
            {value: 'closed', label: lang.l('Closed')}
        ]);

        const organizationSelect = AdminListUi.select(toolbar, 'All organizations', (value): void => {
            filter.organization_id = parseInt(value, 10) || 0;
            reload();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);

        // table ---------------------------------------------------------------------------------
        const tableWrapper = new TableWrapper2<ExternalTourEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No tour dates match the current filter.');

        const columnCount = (): number => 4 + (columns.meeting ? 1 : 0) + (columns.prices ? 1 : 0);

        const renderHead = (): void => {
            const head = table.getThead();
            head.empty();
            const tr = jQuery('<tr/>').appendTo(head);
            const th = (label: string): void => {
                jQuery('<th/>').text(label === '' ? '' : lang.l(label)).appendTo(tr);
            };

            th('Time');
            th('Tour');

            if (columns.meeting) {
                th('Meeting point');
            }

            th('Seats');

            if (columns.prices) {
                th('Prices');
            }

            th('Updated');
        };

        // stats ---------------------------------------------------------------------------------
        const renderStats = (): void => {
            stats.empty();

            const bookable = shown.filter((t) => ToursExternal._status(t) === 'bookable');
            const soldOut = shown.filter((t) => ToursExternal._status(t) === 'sold_out').length;
            const seats = bookable.reduce((sum, t) => sum + Math.max(0, t.capacity_bookable), 0);
            const nowSec = moment().unix();
            const next = bookable.find((t) => t.start_at_utc >= nowSec);
            const lastSeen = allTours.reduce((max, t) => Math.max(max, t.last_seen_at), 0);

            AdminListUi.stat(stats, 'far fa-calendar-alt', `${shown.length}`, 'Tour dates');
            AdminListUi.stat(stats, 'fas fa-check-circle', `${bookable.length}`, 'Bookable', 'text-success');
            AdminListUi.stat(stats, 'fas fa-ban', `${soldOut}`, 'Sold out', 'text-danger');
            AdminListUi.stat(stats, 'fas fa-chair', `${seats}`, 'Free seats');
            AdminListUi.stat(
                stats,
                'fas fa-ship',
                next ? moment.utc(next.start_at * 1000).format('DD.MM. HH:mm') : '—',
                'Next bookable tour',
                'text-primary'
            );
            AdminListUi.stat(
                stats,
                'fas fa-sync-alt',
                lastSeen > 0 ? moment(lastSeen * 1000).format('DD.MM. HH:mm') : '—',
                'Last sync'
            )
            .attr('title', lastSeen > 0 ? moment(lastSeen * 1000).format('YYYY.MM.DD HH:mm') : '');
        };

        // renderer ------------------------------------------------------------------------------
        let lastDay = '';

        const renderRow = (_table: Table2, entry: ExternalTourEntry): void => {
            const term = filter.search;
            const local = moment.utc(entry.start_at * 1000);
            const dayKey = local.format('YYYY-MM-DD');

            if (dayKey !== lastDay) {
                lastDay = dayKey;
                const count = shown.filter((t) => moment.utc(t.start_at * 1000).format('YYYY-MM-DD') === dayKey).length;
                const dayRow = jQuery('<tr class="mwpa-ext-day"/>').appendTo(table.getTbody());
                const dayCell = jQuery('<td/>').attr('colspan', columnCount()).appendTo(dayRow);
                jQuery('<span class="fw-semibold"/>').text(ToursExternal._dayLabel(local)).appendTo(dayCell);
                jQuery('<span class="text-body-secondary ms-2 small"/>')
                .text(`${count} ${lang.l(count === 1 ? 'date' : 'dates')}`)
                .appendTo(dayCell);
            }

            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            if (entry.start_at_utc < moment().unix()) {
                tr.getElement().addClass('opacity-50');
            }

            // time
            const tdTime = new Td2({value: ''});
            tdTime.appendTo(tr);
            jQuery('<div class="fw-semibold fs-6 text-nowrap"/>').text(local.format('HH:mm')).appendTo(tdTime.getElement());

            const utc = moment.utc(entry.start_at_utc * 1000).format('HH:mm');

            if (utc !== local.format('HH:mm')) {
                ToursExternal._subline(tdTime.getElement(), 'fas fa-globe', `${utc} UTC`);
            }

            // tour
            const tdTour = new Td2({value: ''});
            tdTour.appendTo(tr);
            const name = entry.item_name.trim() === '' ? lang.l('Unnamed tour') : entry.item_name;
            jQuery('<div class="fw-semibold"/>')
            .html(AdminListUi.highlight(name, term))
            .toggleClass('text-body-secondary fst-italic', entry.item_name.trim() === '')
            .appendTo(tdTour.getElement());

            if (entry.duration_text.trim() !== '') {
                ToursExternal._subline(tdTour.getElement(), 'far fa-clock', entry.duration_text);
            }

            const organization = morganizations.get(entry.organization_id);

            if (columns.organization) {
                ToursExternal._subline(
                    tdTour.getElement(),
                    'far fa-building',
                    organization?.description ?? `#${entry.organization_id}`
                );
            }

            jQuery('<div class="small text-body-tertiary font-monospace text-nowrap"/>')
            .text(`${entry.provider} · ${entry.external_id}`)
            .attr('title', lang.l('Booking provider · slot id'))
            .appendTo(tdTour.getElement());

            // meeting point
            if (columns.meeting) {
                const tdMeeting = new Td2({value: ''});
                tdMeeting.appendTo(tr);

                if (entry.meeting_name.trim() !== '') {
                    jQuery('<div/>').html(AdminListUi.highlight(entry.meeting_name, term)).appendTo(tdMeeting.getElement());
                }

                if (typeof entry.meeting_lat === 'number' && typeof entry.meeting_lon === 'number') {
                    ToursExternal._subline(
                        tdMeeting.getElement(),
                        'fas fa-map-marker-alt',
                        `${entry.meeting_lat.toFixed(5)}, ${entry.meeting_lon.toFixed(5)}`
                    );
                } else if (entry.meeting_name.trim() === '') {
                    jQuery('<span class="text-body-tertiary small"/>').text(lang.l('unknown')).appendTo(tdMeeting.getElement());
                }
            }

            // seats + status
            const tdSeats = new Td2({value: ''});
            tdSeats.appendTo(tr);
            const seatsLine = jQuery('<div class="d-flex flex-wrap align-items-center gap-2"/>').appendTo(tdSeats.getElement());

            switch (ToursExternal._status(entry)) {
                case 'sold_out':
                    AdminListUi.pill(seatsLine, 'Sold out', 'danger', 'fas fa-ban');
                    break;

                case 'bookable':
                    AdminListUi.pill(seatsLine, 'Bookable', 'success', 'fas fa-check');

                    // FareHarbor reports 0 when it doesn't expose the capacity
                    if (entry.capacity_bookable > 0) {
                        jQuery('<span class="small text-nowrap"/>')
                        .text(`${entry.capacity_bookable} ${lang.l(entry.capacity_bookable === 1 ? 'seat free' : 'seats free')}`)
                        .appendTo(seatsLine);
                    }
                    break;

                default:
                    AdminListUi.pill(seatsLine, 'Closed', 'secondary', 'fas fa-lock');
            }

            if (entry.capacity_reserved > 0) {
                ToursExternal._subline(tdSeats.getElement(), 'fas fa-user-check', `${entry.capacity_reserved} ${lang.l('reserved')}`);
            }

            // prices
            if (columns.prices) {
                const tdPrices = new Td2({value: ''});
                tdPrices.appendTo(tr);
                const prices = entry.customer_types
                .map((ct) => ({name: ct.name, price: ToursExternal._price(ct.price_cents, ct.currency || entry.currency)}))
                .filter((p) => p.price !== '');

                if (prices.length === 0) {
                    jQuery('<span class="text-body-tertiary small"/>').text('—').appendTo(tdPrices.getElement());
                }

                for (const p of prices) {
                    const line = jQuery('<div class="small text-nowrap"/>').appendTo(tdPrices.getElement());
                    jQuery('<span class="text-body-secondary me-1"/>').text(p.name).appendTo(line);
                    jQuery('<span class="fw-semibold"/>').text(p.price).appendTo(line);
                }
            }

            // updated
            const tdUpdated = new Td2({value: ''});
            tdUpdated.appendTo(tr);
            const stamp = entry.last_updated_at > 0 ? entry.last_updated_at : entry.last_seen_at;

            if (stamp > 0) {
                jQuery('<span class="small text-body-secondary text-nowrap"/>')
                .text(moment(stamp * 1000).format('DD.MM.YYYY HH:mm'))
                .appendTo(tdUpdated.getElement());
            } else {
                jQuery('<span class="text-body-tertiary small"/>').text('—').appendTo(tdUpdated.getElement());
            }
        };

        // filtering -----------------------------------------------------------------------------
        const applyFilter = (): void => {
            const end = ToursExternal._periodEnd(filter.period);
            const term = filter.search.trim().toLowerCase();

            shown = allTours.filter((t) => {
                if (end !== null && t.start_at_utc > end) {
                    return false;
                }

                if (filter.organization_id > 0 && t.organization_id !== filter.organization_id) {
                    return false;
                }

                if (filter.item !== '' && ToursExternal._itemKey(t) !== filter.item) {
                    return false;
                }

                if (filter.status !== '' && ToursExternal._status(t) !== filter.status) {
                    return false;
                }

                if (term !== '') {
                    const haystack = `${t.item_name} ${t.meeting_name} ${t.duration_text}`.toLowerCase();
                    return haystack.includes(term);
                }

                return true;
            });
        };

        let loaded = false;

        const loadData = async(): Promise<void> => {
            const [tours, organizations] = await Promise.all([
                ExternalTourAPI.getList(),
                OrganizationAPI.getOrganizationByUser(true)
            ]);

            allTours = tours;
            morganizations.clear();

            for (const o of organizations ?? []) {
                morganizations.set(o.id, o);
            }

            const orgIds = new Set(allTours.map((t) => t.organization_id));
            columns.organization = orgIds.size > 1;
            columns.meeting = allTours.some((t) => t.meeting_name.trim() !== '' || typeof t.meeting_lat === 'number');
            columns.prices = allTours.some((t) => t.customer_types.some((ct) => ct.price_cents > 0));

            organizationSelect.toggleClass('d-none', !columns.organization);
            AdminListUi.setOptions(organizationSelect, [...orgIds]
            .map((id) => ({value: `${id}`, label: morganizations.get(id)?.description ?? `#${id}`}))
            .sort((a, b) => a.label.localeCompare(b.label)));

            const items = new Map<string, string>();

            for (const t of allTours) {
                const key = ToursExternal._itemKey(t);

                if (!items.has(key) || items.get(key) === '') {
                    items.set(key, t.item_name.trim());
                }
            }

            itemSelect.toggleClass('d-none', items.size < 2);
            AdminListUi.setOptions(itemSelect, [...items.entries()]
            .map(([value, label]) => ({value, label: label === '' ? lang.l('Unnamed tour') : label}))
            .sort((a, b) => a.label.localeCompare(b.label)));

            renderHead();
            loaded = true;
        };

        const render = async(): Promise<void> => {
            card.showLoading();

            try {
                if (!loaded) {
                    await loadData();
                }

                applyFilter();
                renderStats();
                card.setTitle(`${lang.l('Tours External')} (${allTours.length})`);
                AdminListUi.setEmpty(emptyInfo, shown.length === 0);
                AdminListUi.setResult(resultInfo, shown.length, allTours.length);
                await tableWrapper.reset();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
                Tooltip2.init();
            }
        };

        // one render at a time, otherwise two quick filter changes interleave their rows
        let queue: Promise<void> = Promise.resolve();

        this._onLoadTable = async(): Promise<void> => {
            queue = queue.then(render, render);
            return queue;
        };

        tableWrapper.setDataSource(
            async(page) => {
                if (page === 0) {
                    lastDay = '';
                }

                const offset = page * ToursExternal._PAGE_SIZE;
                return shown.slice(offset, offset + ToursExternal._PAGE_SIZE);
            },
            renderRow,
            false
        );

        await this._onLoadTable();
    }

}