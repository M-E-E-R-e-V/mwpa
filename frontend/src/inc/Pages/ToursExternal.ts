import {
    Badge2,
    BadgeType2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    LangTextV2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tr2
} from 'bambooo';
import moment from 'moment';
import {ExternalTour as ExternalTourAPI, ExternalTourEntry} from '../Api/ExternalTour';
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

const PAGE_SIZE = 50;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

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
        const content = this._wrapper.getContentWrapper().getContent();
        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Tours External'}));

        let allTours: ExternalTourEntry[] = [];
        let orgNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper2<ExternalTourEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        new Th2({value: new LangTextV2({text: 'Date / Time'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Organisation'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Item'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Meeting point'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Capacity'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Status'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Prices'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Last seen'})}).appendTo(trhead);

        const renderRow = (_table: Table2, entry: ExternalTourEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());

            const startLocal = moment(entry.start_at * 1000).utc();
            const startUtc = moment(entry.start_at_utc * 1000).utc();
            new Td2({
                value: `<b>${startLocal.format('YYYY-MM-DD')}</b>`
                    + `<br>${startLocal.format('HH:mm')}<span class="text-muted small"> local</span>`
                    + `<br><small class="text-muted">${startUtc.format('HH:mm')} UTC</small>`
            }).appendTo(trbody);

            const orgName = orgNameById.get(entry.organization_id) ?? `#${entry.organization_id}`;
            new Td2({
                value: `${escapeHtml(orgName)}<br><small class="text-muted">${escapeHtml(entry.provider)}</small>`
            }).appendTo(trbody);

            new Td2({
                value: `<b>${escapeHtml(entry.item_name)}</b>`
                    + `<br><small class="text-muted">${escapeHtml(entry.duration_text)}</small>`
                    + `<br><small class="text-muted">#${escapeHtml(entry.item_pk)} / ext ${escapeHtml(entry.external_id)}</small>`
            }).appendTo(trbody);

            const meetingTd = new Td2({value: ''});
            meetingTd.appendTo(trbody);
            if (entry.meeting_name && entry.meeting_name !== '') {
                meetingTd.append(escapeHtml(entry.meeting_name));
            }
            if (typeof entry.meeting_lat === 'number' && typeof entry.meeting_lon === 'number') {
                meetingTd.append(`<br><small class="text-muted">${entry.meeting_lat.toFixed(5)}, ${entry.meeting_lon.toFixed(5)}</small>`);
            } else if (!entry.meeting_name) {
                meetingTd.append('<span class="text-muted">—</span>');
            }

            new Td2({
                value: `<b>${entry.capacity_bookable}</b> bookable${
                    entry.capacity_reserved > 0 ? `<br><small>${entry.capacity_reserved} reserved</small>` : ''}`
            }).appendTo(trbody);

            const statusTd = new Td2({value: ''});
            statusTd.appendTo(trbody);
            if (entry.is_sold_out) {
                new Badge2({text: 'sold out', type: BadgeType2.danger}).appendTo(statusTd);
            } else if (entry.is_bookable) {
                new Badge2({text: 'bookable', type: BadgeType2.success}).appendTo(statusTd);
            } else {
                new Badge2({text: 'closed', type: BadgeType2.secondary}).appendTo(statusTd);
            }

            const pricesTd = new Td2({value: ''});
            pricesTd.appendTo(trbody);
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

            new Td2({
                value: entry.last_seen_at > 0
                    ? `<small>${moment(entry.last_seen_at * 1000).fromNow()}</small>`
                    : '<span class="text-muted">—</span>'
            }).appendTo(trbody);

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