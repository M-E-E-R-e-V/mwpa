import {
    Badge,
    BadgeType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    LangText,
    Table,
    Td,
    Th,
    Tooltip,
    Tr
} from 'bambooo';
import moment from 'moment';
import {Devices as DevicesAPI, DeviceEntry} from '../Api/Devices';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;');

const formatTs = (ts: number): string => ts > 0 ? moment(ts * 1000).format('YYYY.MM.DD HH:mm') : '-';

/**
 * Truncate the device identity (often a 32-char UUID) for the cell, keeping
 * the last 6 chars so the user can spot-check.
 */
const truncateIdentity = (id: string): string => {
    if (id.length <= 12) {
        return id;
    }
    return `${id.slice(0, 4)}…${id.slice(-6)}`;
};

/**
 * Days-since helper for the last-activity hint badge.
 */
const daysSince = (ts: number): number => {
    if (ts <= 0) {
        return -1;
    }
    return Math.floor((Date.now() - (ts * 1000)) / (1000 * 60 * 60 * 24));
};

/**
 * Devices admin page. Read-only listing of every mobile device that has logged
 * in, with the bound user, the user's organization, sighting + tour counts and
 * the last-seen timestamp. Sorted by most recent activity (server-side).
 */
export class Devices extends BasePage {

    protected override _name: string = 'admin-devices';

    public override async loadContent(): Promise<void> {
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol(row, ContentColSize.col12));
            card.setTitle(new LangText('Devices'));
            card.showLoading();

            const devices = await DevicesAPI.getList();

            card.setTitle(`${Lang.i().l('Devices')} (${devices.length})`);

            const tableWrap = jQuery('<div class="table-responsive"/>').appendTo(card.getElement());
            const table = new Table(tableWrap, {striped: true});
            const thead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(thead, new LangText('Id'));
            // eslint-disable-next-line no-new
            new Th(thead, new LangText('Device'));
            // eslint-disable-next-line no-new
            new Th(thead, new LangText('User / Organization'));
            // eslint-disable-next-line no-new
            new Th(thead, new LangText('Description'));
            // eslint-disable-next-line no-new
            new Th(thead, new LangText('Activity'));
            // eslint-disable-next-line no-new
            new Th(thead, new LangText('First seen'));
            // eslint-disable-next-line no-new
            new Th(thead, new LangText('Last login'));

            for (const d of devices) {
                this._renderRow(table, d);
            }

            Tooltip.init();
            card.hideLoading();
            Lang.i().lAll();
        };

        await this._onLoadTable();
    }

    /**
     * Build one table row from a DeviceEntry. Pulled out so the renderer is
     * easy to read alongside the column definitions.
     */
    protected _renderRow(table: Table, d: DeviceEntry): void {
        const trbody = new Tr(table.getTbody());

        // eslint-disable-next-line no-new
        new Td(trbody, `<b>#${d.id}</b>`);

        // device — truncated identity with full identity in tooltip
        const deviceTd = new Td(trbody);
        const identityHtml = `<code data-toggle="tooltip" data-original-title="${escapeHtml(d.identity)}" style="cursor:help;">${escapeHtml(truncateIdentity(d.identity))}</code>`;
        deviceTd.append(identityHtml);

        // user + org — name on top, email + org muted below
        const userTd = new Td(trbody);
        const userLine = d.user_id > 0
            ? `<b>${escapeHtml(d.user_name || '(unnamed user)')}</b>`
            : '<span class="text-muted">(unbound)</span>';
        const emailLine = d.user_email === '' ? '' : `<small class="text-muted">${escapeHtml(d.user_email)}</small>`;
        const orgLine = d.organization_name === ''
            ? ''
            : `<small class="text-muted"><i class="fas fa-building mr-1"></i>${escapeHtml(d.organization_name)}</small>`;
        userTd.append([userLine, emailLine, orgLine].filter((s) => s !== '').join('<br>'));

        // eslint-disable-next-line no-new
        new Td(trbody, escapeHtml(d.description || ''));

        // activity column — sighting + tour badges + recency hint
        const activityTd = new Td(trbody);

        // eslint-disable-next-line no-new
        new Badge(
            activityTd,
            `<i class="fas fa-binoculars mr-1"></i>${d.sighting_count}`,
            BadgeType.info,
            d.sighting_count > 0 ? 'primary' : 'secondary'
        );
        activityTd.append('&nbsp;');
        // eslint-disable-next-line no-new
        new Badge(
            activityTd,
            `<i class="fas fa-route mr-1"></i>${d.tour_count}`,
            BadgeType.info,
            d.tour_count > 0 ? 'success' : 'secondary'
        );

        if (d.last_sighting_datetime > 0) {
            const days = daysSince(d.last_sighting_datetime);
            let recency = 'secondary';
            if (days <= 7) {
                recency = 'success';
            } else if (days <= 30) {
                recency = 'warning';
            }
            let label = `${days}d ago`;
            if (days === 0) {
                label = 'today';
            } else if (days === 1) {
                label = '1d ago';
            }
            activityTd.append('<br>');
            // eslint-disable-next-line no-new
            new Badge(activityTd, label, BadgeType.info, recency);
        } else {
            activityTd.append('<br><span class="text-muted small">no sightings yet</span>');
        }

        // eslint-disable-next-line no-new
        new Td(trbody, formatTs(d.create_datetime));
        // eslint-disable-next-line no-new
        new Td(trbody, formatTs(d.update_datetime));
    }

}