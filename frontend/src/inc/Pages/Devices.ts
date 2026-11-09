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
import {Devices as DevicesAPI, DeviceEntry} from '../Api/Devices';
import {Lang} from '../Lang';
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';

/**
 * Sortable columns
 */
type SortKey = 'id' | 'device' | 'user' | 'organization' | 'sightings' | 'lastSighting' | 'lastLogin';

/**
 * Sort state per column
 */
type SortState = Record<SortKey, SortOrder2>;

/**
 * Activity filter of the toolbar
 */
type DeviceActivityFilter = 'all' | 'week' | 'month' | 'inactive' | 'none';

/**
 * Toolbar filter state
 */
type DeviceFilter = {
    term: string;
    organizationId: number;
    activity: DeviceActivityFilter;
};

/**
 * Devices admin page — read-only list of every mobile device that has
 * logged in. Same look as the other admin lists (see {@link AdminListUi}):
 * search, organization + activity filter, summary figures (devices, active
 * in the last 7 / 30 days, sightings, tours) and per device the bound user,
 * organization, sighting / tour counts and how long ago it last sent a
 * sighting (green ≤ 7 days, yellow ≤ 30 days, grey older).
 */
export class Devices extends BasePage {

    /**
     * Rows per TableWrapper page
     * @protected
     */
    protected static readonly _PAGE_SIZE = 30;

    protected override _name: string = 'admin-devices';

    /**
     * Format a unix timestamp (seconds), '—' for none.
     * @param {number} ts
     * @return {string}
     * @protected
     */
    protected static _formatTs(ts: number): string {
        return ts > 0 ? moment(ts * 1000).format('YYYY.MM.DD HH:mm') : '—';
    }

    /**
     * Whole days since a unix timestamp (seconds), -1 for none.
     * @param {number} ts
     * @return {number}
     * @protected
     */
    protected static _daysSince(ts: number): number {
        if (ts <= 0) {
            return -1;
        }

        return Math.max(0, Math.floor((Date.now() - (ts * 1000)) / 86400000));
    }

    /**
     * "today" / "yesterday" / "n days ago" (translated).
     * @param {number} days
     * @return {string}
     * @protected
     */
    protected static _ago(days: number): string {
        const lang = Lang.i();

        if (days === 0) {
            return lang.l('today');
        }

        if (days === 1) {
            return lang.l('yesterday');
        }

        return lang.l('%d days ago').replace('%d', `${days}`);
    }

    /**
     * Shorten the device identity (often a 32-char UUID), keeping the end
     * so it can be spot-checked; the full value is in the tooltip.
     * @param {string} id
     * @return {string}
     * @protected
     */
    protected static _shortIdentity(id: string): string {
        if (id.length <= 14) {
            return id;
        }

        return `${id.slice(0, 4)}…${id.slice(-8)}`;
    }

    /**
     * Device description for display: the app sends the model plus the
     * Dart `toString()` of the build-version object ("RT1 - Instance of
     * 'AndroidBuildVersion'"), which carries no information — strip it.
     * @param {string} description
     * @return {string}
     * @protected
     */
    protected static _model(description: string): string {
        return description.replace(/\s*-?\s*Instance of '[^']*'\s*$/u, '').trim();
    }

    /**
     * Recency tone by days since the last sighting.
     * @param {number} days
     * @return {'success'|'warning'|'secondary'}
     * @protected
     */
    protected static _tone(days: number): 'success' | 'warning' | 'secondary' {
        if (days >= 0 && days <= 7) {
            return 'success';
        }

        if (days >= 0 && days <= 30) {
            return 'warning';
        }

        return 'secondary';
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();

        const content = this._wrapper.getContentWrapper().getContent();
        const row = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Devices'}));

        const filter: DeviceFilter = {
            term: '',
            organizationId: 0,
            activity: 'all'
        };

        let allDevices: DeviceEntry[] = [];
        let filteredDevices: DeviceEntry[] = [];

        // assigned below, used by the toolbar + sort handlers
        let applyFilter: (() => void) | null = null;

        // toolbar -----------------------------------------------------------------------------------------------------

        const toolbar = AdminListUi.toolbar(card.getElement());

        AdminListUi.search(toolbar, 'Search device, user, organization or id …', (term): void => {
            filter.term = term;
            applyFilter?.();
        });

        const orgSelect = AdminListUi.select(toolbar, 'All organizations', (value): void => {
            filter.organizationId = parseInt(value, 10) || 0;
            applyFilter?.();
        });

        const activitySelect = AdminListUi.select(toolbar, 'Any activity', (value): void => {
            filter.activity = value === '0' ? 'all' : value as DeviceActivityFilter;
            applyFilter?.();
        });

        AdminListUi.setOptions(activitySelect, [
            {value: 'week', label: lang.l('Sighting in the last 7 days')},
            {value: 'month', label: lang.l('Sighting in the last 30 days')},
            {value: 'inactive', label: lang.l('No sighting for over 30 days')},
            {value: 'none', label: lang.l('No sightings yet')}
        ]);

        const resultInfo = AdminListUi.resultInfo(toolbar);
        const stats = AdminListUi.statsRow(card.getElement());

        // table -------------------------------------------------------------------------------------------------------

        const sort: SortState = {
            id: SortOrder2.NONE,
            device: SortOrder2.NONE,
            user: SortOrder2.NONE,
            organization: SortOrder2.NONE,
            sightings: SortOrder2.NONE,
            lastSighting: SortOrder2.DESC,
            lastLogin: SortOrder2.NONE
        };

        const tableWrapper = new TableWrapper2<DeviceEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No devices match the current filter.');
        const table = tableWrapper.getTable();
        table.getElement().addClass('table-hover align-middle mb-0');
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        const sortRegistry: {key: SortKey; column: LangTextV2;}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangTextV2 => {
            const column = new LangTextV2({
                text: label,
                onClick: (element): void => {
                    const newValue = SortingColumn2.changeSort(element, sort[key]);

                    for (const other of sortRegistry) {
                        if (other.key !== key) {
                            sort[other.key] = SortOrder2.NONE;
                            SortingColumn2.initSort(other.column, SortOrder2.NONE);
                        }
                    }

                    sort[key] = newValue as SortOrder2;
                    applyFilter?.();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        const thIcon = new Th2({value: ''});
        thIcon.appendTo(trhead);
        thIcon.getElement().css('width', '56px');
        new Th2({value: makeSortColumn('Device', 'device')}).appendTo(trhead);
        new Th2({value: makeSortColumn('User', 'user')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Organization', 'organization')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Activity', 'sightings')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Last sighting', 'lastSighting')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Last login', 'lastLogin')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Id', 'id')}).appendTo(trhead);

        const renderRow = (_table: Table2, d: DeviceEntry): void => {
            const term = filter.term;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            const days = Devices._daysSince(d.last_sighting_datetime);
            const tone = Devices._tone(days);

            // icon, coloured by recency
            const tdIcon = new Td2({value: ''});
            tdIcon.appendTo(tr);
            const icon = jQuery('<div class="rounded-circle d-flex align-items-center justify-content-center"/>')
            .css({width: '36px', height: '36px'})
            .addClass(`bg-${tone}-subtle text-${tone}-emphasis`)
            .appendTo(tdIcon.getElement());
            jQuery('<i class="fas fa-mobile-alt"/>').appendTo(icon);

            // device: description + identity
            const tdDevice = new Td2({value: ''});
            tdDevice.appendTo(tr);
            const description = Devices._model(d.description);

            if (description === '') {
                jQuery('<span class="fst-italic text-body-secondary"/>').text(lang.l('No description')).appendTo(tdDevice.getElement());
            } else {
                jQuery('<span class="fw-semibold"/>').html(AdminListUi.highlight(description, term)).appendTo(tdDevice.getElement());
            }

            const identity = jQuery('<div class="small"/>').appendTo(tdDevice.getElement());
            jQuery('<code class="text-body-secondary" style="cursor:help;"/>')
            .attr('data-bs-toggle', 'tooltip')
            .attr('data-bs-title', d.identity)
            .html(AdminListUi.highlight(Devices._shortIdentity(d.identity), term))
            .appendTo(identity);

            const copy = jQuery('<button type="button" class="btn btn-link btn-sm p-0 ms-2 align-baseline"/>')
            .attr('title', lang.l('Copy device id'))
            .appendTo(identity);
            jQuery('<i class="far fa-copy"/>').appendTo(copy);
            copy.on('click', (): void => {
                navigator.clipboard?.writeText(d.identity).then((): void => {
                    this._toast.fire({icon: 'success', title: lang.l('Copied.')});
                }).catch((): void => {
                    this._toast.fire({icon: 'error', title: d.identity});
                });
            });

            // user
            const tdUser = new Td2({value: ''});
            tdUser.appendTo(tr);

            if (d.user_id > 0) {
                jQuery('<div class="fw-semibold"/>')
                .html(AdminListUi.highlight(d.user_name === '' ? lang.l('(unnamed user)') : d.user_name, term))
                .appendTo(tdUser.getElement());

                if (d.user_email !== '') {
                    jQuery('<div class="small text-body-secondary"/>').html(AdminListUi.highlight(d.user_email, term)).appendTo(tdUser.getElement());
                }
            } else {
                AdminListUi.pill(tdUser.getElement(), 'Not bound to a user', 'warning', 'fas fa-user-slash');
            }

            // organization
            const tdOrg = new Td2({value: ''});
            tdOrg.appendTo(tr);

            if (d.organization_name === '') {
                jQuery('<span class="small text-body-tertiary"/>').text('—').appendTo(tdOrg.getElement());
            } else {
                const org = jQuery('<span/>').appendTo(tdOrg.getElement());
                jQuery('<i class="fas fa-building me-2 text-body-secondary"/>').appendTo(org);
                jQuery('<span/>').html(AdminListUi.highlight(d.organization_name, term)).appendTo(org);
            }

            // activity counts
            const tdActivity = new Td2({value: ''});
            tdActivity.appendTo(tr);
            const counts = jQuery('<div class="d-flex flex-wrap gap-1"/>').appendTo(tdActivity.getElement());
            AdminListUi.pill(counts, `${d.sighting_count}`, d.sighting_count > 0 ? 'primary' : 'secondary', 'fas fa-binoculars')
            .attr('title', lang.l('Sightings'));
            AdminListUi.pill(counts, `${d.tour_count}`, d.tour_count > 0 ? 'success' : 'secondary', 'fas fa-route')
            .attr('title', lang.l('Tours'));

            // last sighting
            const tdLast = new Td2({value: ''});
            tdLast.appendTo(tr);

            if (days < 0) {
                jQuery('<span class="small text-body-tertiary"/>').text(lang.l('No sightings yet')).appendTo(tdLast.getElement());
            } else {
                AdminListUi.pill(tdLast.getElement(), Devices._ago(days), tone, 'far fa-clock');
                jQuery('<div class="small text-body-secondary"/>').text(Devices._formatTs(d.last_sighting_datetime)).appendTo(tdLast.getElement());
            }

            // last login + first seen
            const tdLogin = new Td2({value: ''});
            tdLogin.appendTo(tr);
            jQuery('<div class="small"/>').text(Devices._formatTs(d.update_datetime)).appendTo(tdLogin.getElement());
            jQuery('<div class="small text-body-secondary"/>')
            .text(`${lang.l('since')} ${d.create_datetime > 0 ? moment(d.create_datetime * 1000).format('YYYY.MM.DD') : '—'}`)
            .attr('title', lang.l('First seen'))
            .appendTo(tdLogin.getElement());

            // id
            const tdId = new Td2({value: ''});
            tdId.appendTo(tr);
            jQuery('<span class="font-monospace small text-body-secondary"/>').text(`#${d.id}`).appendTo(tdId.getElement());
        };

        // filter + sort -----------------------------------------------------------------------------------------------

        const sortValue = (d: DeviceEntry, key: SortKey): string | number => {
            switch (key) {
                case 'id':
                    return d.id;

                case 'device':
                    return (Devices._model(d.description) || d.identity).toLowerCase();

                case 'user':
                    return d.user_name.toLowerCase();

                case 'organization':
                    return d.organization_name.toLowerCase();

                case 'sightings':
                    return d.sighting_count;

                case 'lastSighting':
                    return d.last_sighting_datetime;

                case 'lastLogin':
                    return d.update_datetime;
            }

            return 0;
        };

        const matches = (d: DeviceEntry): boolean => {
            if (filter.organizationId !== 0 && d.organization_id !== filter.organizationId) {
                return false;
            }

            const days = Devices._daysSince(d.last_sighting_datetime);

            switch (filter.activity) {
                case 'week':
                    if (days < 0 || days > 7) {
                        return false;
                    }
                    break;

                case 'month':
                    if (days < 0 || days > 30) {
                        return false;
                    }
                    break;

                case 'inactive':
                    if (days <= 30) {
                        return false;
                    }
                    break;

                case 'none':
                    if (days >= 0) {
                        return false;
                    }
                    break;

                default:
            }

            const term = filter.term.toLowerCase();

            if (term === '') {
                return true;
            }

            return [
                d.identity,
                d.description,
                d.user_name,
                d.user_email,
                d.organization_name,
                `${d.id}`
            ].some((value) => value.toLowerCase().includes(term));
        };

        applyFilter = (): void => {
            filteredDevices = allDevices.filter(matches);

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const dir = sort[activeKey] === SortOrder2.DESC ? -1 : 1;

                filteredDevices.sort((a, b) => {
                    const av = sortValue(a, activeKey);
                    const bv = sortValue(b, activeKey);

                    if (av < bv) {
                        return -1 * dir;
                    }

                    if (av > bv) {
                        return Number(dir);
                    }

                    return 0;
                });
            }

            AdminListUi.setResult(resultInfo, filteredDevices.length, allDevices.length);
            AdminListUi.setEmpty(emptyInfo, filteredDevices.length === 0);

            tableWrapper.reset().then((): void => {
                Tooltip2.init();
            });
        };

        const renderStats = (): void => {
            stats.empty();

            const week = allDevices.filter((d) => Devices._tone(Devices._daysSince(d.last_sighting_datetime)) === 'success').length;
            const month = allDevices.filter((d) => {
                const days = Devices._daysSince(d.last_sighting_datetime);
                return days >= 0 && days <= 30;
            }).length;
            const sightings = allDevices.reduce((sum, d) => sum + d.sighting_count, 0);
            const tours = allDevices.reduce((sum, d) => sum + d.tour_count, 0);

            AdminListUi.stat(stats, 'fas fa-mobile-alt', `${allDevices.length}`, 'Devices', 'text-primary');
            AdminListUi.stat(stats, 'fas fa-bolt', `${week}`, 'active in the last 7 days', week > 0 ? 'text-success' : 'text-body-secondary');
            AdminListUi.stat(stats, 'far fa-calendar-alt', `${month}`, 'active in the last 30 days', month > 0 ? 'text-warning' : 'text-body-secondary');
            AdminListUi.stat(stats, 'fas fa-binoculars', sightings.toLocaleString(), 'Sightings');
            AdminListUi.stat(stats, 'fas fa-route', tours.toLocaleString(), 'Tours');
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();

            try {
                allDevices = await DevicesAPI.getList();
                card.setTitle(`${lang.l('Devices')} (${allDevices.length})`);

                const orgs = new Map<number, string>();

                for (const d of allDevices) {
                    if (d.organization_id > 0 && d.organization_name !== '') {
                        orgs.set(d.organization_id, d.organization_name);
                    }
                }

                AdminListUi.setOptions(orgSelect, [...orgs.entries()].map(([id, name]) => ({value: `${id}`, label: name})));

                renderStats();
                applyFilter?.();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => {
                const offset = page * Devices._PAGE_SIZE;
                return filteredDevices.slice(offset, offset + Devices._PAGE_SIZE);
            },
            renderRow,
            false
        );

        await this._onLoadTable();
    }

}