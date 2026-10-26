import {
    Badge2,
    BadgeType2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    LangTextV2,
    Table2,
    Td2,
    Th2,
    Tooltip2,
    Tr2
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
            const content = this._wrapper.getContentWrapper().getContent();
            content.empty();

            const row = new ContentRow2(content.getContentFluidElement());
            const card = new Card2({});
            card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
            card.setTitle(new LangTextV2({text: 'Devices'}));
            card.showLoading();

            const devices = await DevicesAPI.getList();

            card.setTitle(`${Lang.i().l('Devices')} (${devices.length})`);

            const tableWrap = jQuery('<div class="table-responsive"/>').appendTo(card.getElement());
            const table = new Table2({striped: true});
            table.appendTo(tableWrap);
            const thead = new Tr2();
            thead.appendTo(table.getThead());

            new Th2({value: new LangTextV2({text: 'Id'})}).appendTo(thead);
            new Th2({value: new LangTextV2({text: 'Device'})}).appendTo(thead);
            new Th2({value: new LangTextV2({text: 'User / Organization'})}).appendTo(thead);
            new Th2({value: new LangTextV2({text: 'Description'})}).appendTo(thead);
            new Th2({value: new LangTextV2({text: 'Activity'})}).appendTo(thead);
            new Th2({value: new LangTextV2({text: 'First seen'})}).appendTo(thead);
            new Th2({value: new LangTextV2({text: 'Last login'})}).appendTo(thead);

            for (const d of devices) {
                this._renderRow(table, d);
            }

            Tooltip2.init();
            card.hideLoading();
            Lang.i().lAll();
        };

        await this._onLoadTable();
    }

    /**
     * Build one table row from a DeviceEntry. Pulled out so the renderer is
     * easy to read alongside the column definitions.
     */
    protected _renderRow(table: Table2, d: DeviceEntry): void {
        const trbody = new Tr2();
        trbody.appendTo(table.getTbody());

        new Td2({value: `<b>#${d.id}</b>`}).appendTo(trbody);

        // device — truncated identity with full identity in tooltip
        const deviceTd = new Td2({});
        deviceTd.appendTo(trbody);
        const identityHtml = `<code data-bs-toggle="tooltip" data-bs-title="${escapeHtml(d.identity)}" style="cursor:help;">${escapeHtml(truncateIdentity(d.identity))}</code>`;
        deviceTd.append(identityHtml);

        // user + org — name on top, email + org muted below
        const userTd = new Td2({});
        userTd.appendTo(trbody);
        const userLine = d.user_id > 0
            ? `<b>${escapeHtml(d.user_name || '(unnamed user)')}</b>`
            : '<span class="text-muted">(unbound)</span>';
        const emailLine = d.user_email === '' ? '' : `<small class="text-muted">${escapeHtml(d.user_email)}</small>`;
        const orgLine = d.organization_name === ''
            ? ''
            : `<small class="text-muted"><i class="fas fa-building mr-1"></i>${escapeHtml(d.organization_name)}</small>`;
        userTd.append([userLine, emailLine, orgLine].filter((s) => s !== '').join('<br>'));

        new Td2({value: escapeHtml(d.description || '')}).appendTo(trbody);

        // activity column — sighting + tour badges + recency hint
        const activityTd = new Td2({});
        activityTd.appendTo(trbody);

        const sightingBadge = new Badge2({
            type: BadgeType2.info,
            color: d.sighting_count > 0 ? 'primary' : 'secondary'
        });
        sightingBadge.getElement().html(`<i class="fas fa-binoculars mr-1"></i>${d.sighting_count}`);
        sightingBadge.appendTo(activityTd);
        activityTd.append('&nbsp;');
        const tourBadge = new Badge2({
            type: BadgeType2.info,
            color: d.tour_count > 0 ? 'success' : 'secondary'
        });
        tourBadge.getElement().html(`<i class="fas fa-route mr-1"></i>${d.tour_count}`);
        tourBadge.appendTo(activityTd);

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
            new Badge2({text: label, type: BadgeType2.info, color: recency}).appendTo(activityTd);
        } else {
            activityTd.append(`<br><span class="text-muted small">${Lang.i().l('no sightings yet')}</span>`);
        }

        new Td2({value: formatTs(d.create_datetime)}).appendTo(trbody);
        new Td2({value: formatTs(d.update_datetime)}).appendTo(trbody);
    }

}