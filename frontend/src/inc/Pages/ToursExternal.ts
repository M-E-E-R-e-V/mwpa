import {
    Badge,
    BadgeType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    LangText,
    Table,
    TableWrapper,
    Td,
    Th,
    Tr
} from 'bambooo';
import moment from 'moment';
import {ExternalTour as ExternalTourAPI, ExternalTourEntry} from '../Api/ExternalTour';
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

const PAGE_SIZE = 50;

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Format a unix-seconds price (in cents) as a currency string.
 * Returns '—' on zero / missing input.
 */
const formatPrice = (cents: number, currency: string): string => {
    if (!Number.isFinite(cents) || cents <= 0) {
        return '—';
    }
    return `${(cents / 100).toFixed(2)} ${currency}`;
};

/**
 * "Tours External" page — read-only view of `external_tour` rows
 * pulled from booking providers (FareHarbor today).
 *
 * Window: now → now+60 days (matches the cron's pull window). Sorted
 * by start_at_utc ascending so the next upcoming slot is on top.
 * Non-admins are server-side scoped to their organisations.
 */
export class ToursExternal extends BasePage {

    public static NAME: string = 'tours-external';

    protected override _name: string = ToursExternal.NAME;

    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Tours External'));

        let allTours: ExternalTourEntry[] = [];
        let orgNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper<ExternalTourEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Date / Time'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Organisation'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Item'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Meeting point'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Capacity'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Status'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Prices'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Last seen'));

        const renderRow = (_table: Table, entry: ExternalTourEntry): void => {
            const trbody = new Tr(table.getTbody());

            const startLocal = moment(entry.start_at * 1000).utc();
            const startUtc = moment(entry.start_at_utc * 1000).utc();
            // eslint-disable-next-line no-new
            new Td(
                trbody,
                `<b>${startLocal.format('YYYY-MM-DD')}</b>`
                + `<br>${startLocal.format('HH:mm')}<span class="text-muted small"> local</span>`
                + `<br><small class="text-muted">${startUtc.format('HH:mm')} UTC</small>`
            );

            const orgName = orgNameById.get(entry.organization_id) ?? `#${entry.organization_id}`;
            // eslint-disable-next-line no-new
            new Td(
                trbody,
                `${escapeHtml(orgName)}<br><small class="text-muted">${escapeHtml(entry.provider)}</small>`
            );

            // eslint-disable-next-line no-new
            new Td(
                trbody,
                `<b>${escapeHtml(entry.item_name)}</b>`
                + `<br><small class="text-muted">${escapeHtml(entry.duration_text)}</small>`
                + `<br><small class="text-muted">#${escapeHtml(entry.item_pk)} / ext ${escapeHtml(entry.external_id)}</small>`
            );

            const meetingTd = new Td(trbody, '');
            if (entry.meeting_name && entry.meeting_name !== '') {
                meetingTd.append(escapeHtml(entry.meeting_name));
            }
            if (typeof entry.meeting_lat === 'number' && typeof entry.meeting_lon === 'number') {
                meetingTd.append(`<br><small class="text-muted">${entry.meeting_lat.toFixed(5)}, ${entry.meeting_lon.toFixed(5)}</small>`);
            } else if (!entry.meeting_name) {
                meetingTd.append('<span class="text-muted">—</span>');
            }

            // eslint-disable-next-line no-new
            new Td(
                trbody,
                `<b>${entry.capacity_bookable}</b> bookable`
                + (entry.capacity_reserved > 0 ? `<br><small>${entry.capacity_reserved} reserved</small>` : '')
            );

            const statusTd = new Td(trbody, '');
            if (entry.is_sold_out) {
                // eslint-disable-next-line no-new
                new Badge(statusTd, 'sold out', BadgeType.danger);
            } else if (entry.is_bookable) {
                // eslint-disable-next-line no-new
                new Badge(statusTd, 'bookable', BadgeType.success);
            } else {
                // eslint-disable-next-line no-new
                new Badge(statusTd, 'closed', BadgeType.secondary);
            }

            const pricesTd = new Td(trbody, '');
            if (entry.customer_types.length === 0) {
                pricesTd.append('<span class="text-muted">—</span>');
            } else {
                const lines = entry.customer_types.map((ct) => {
                    const label = escapeHtml(ct.name);
                    const price = formatPrice(ct.price_cents, ct.currency || entry.currency);
                    return `<div><span class="small">${label}</span> <b>${price}</b></div>`;
                });
                pricesTd.append(lines.join(''));
            }

            // eslint-disable-next-line no-new
            new Td(
                trbody,
                entry.last_seen_at > 0
                    ? `<small>${moment(entry.last_seen_at * 1000).fromNow()}</small>`
                    : '<span class="text-muted">—</span>'
            );

            Lang.i().lAll();
        };

        const buildPage = (page: number): ExternalTourEntry[] => {
            const offset = page * PAGE_SIZE;
            return allTours.slice(offset, offset + PAGE_SIZE);
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            try {
                const [tours, orgs] = await Promise.all([
                    ExternalTourAPI.getList(),
                    OrganizationAPI.getOrganizations()
                ]);

                allTours = tours;
                orgNameById = new Map<number, string>();
                for (const o of (orgs as OrganizationFullEntry[] | null) ?? []) {
                    orgNameById.set(o.id, o.description);
                }

                card.setTitle(`Tours External (${allTours.length})`);
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

        this._onLoadTable();
    }

}