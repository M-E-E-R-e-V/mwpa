import {
    Badge,
    BadgeType,
    ButtonClass,
    ButtonDefault,
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    DialogConfirm,
    IconFa,
    LangText,
    ModalDialogType,
    Table,
    TableWrapper,
    Td,
    Th,
    Tr
} from 'bambooo';
import moment from 'moment';
import {Service as ServiceAPI, ServiceInfoEntry} from '../Api/Service';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

const PAGE_SIZE = 50;
const AUTO_REFRESH_MS = 5000;

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Map figtree's `ServiceStatus` enum to a bambooo Badge type so the
 * colour-coding is consistent across the list (rows + scheduler
 * sub-status).
 */
const statusBadge = (status: string): BadgeType => {
    switch (status) {
        case 'success':
            return BadgeType.success;
        case 'progress':
            return BadgeType.info;
        case 'error':
            return BadgeType.danger;
        case 'none':
        default:
            return BadgeType.secondary;
    }
};

/**
 * Map figtree's `ServiceImportance` ("0"/"1"/"2") to a human label
 * + badge colour. Critical services get a red badge so admins know
 * what they're about to stop.
 */
const importanceLabel = (importance: string): {text: string; badge: BadgeType} => {
    switch (importance) {
        case '2':
            return {text: 'critical', badge: BadgeType.danger};
        case '1':
            return {text: 'important', badge: BadgeType.warning};
        case '0':
        default:
            return {text: 'optional', badge: BadgeType.secondary};
    }
};

/**
 * Service-Manager admin page.
 *
 * Reads `/json/v1/service/status` every 5 s while the page is open
 * (auto-refresh stops when the user navigates away) so the table
 * reflects current `progress` / `success` / `error` state without a
 * manual reload. Each row exposes:
 *   - Start / Stop for the service itself (figtree's ServiceManager
 *     handles dependency ordering)
 *   - Invoke (scheduler services only) — fires the cron tick
 *     immediately instead of waiting for the next interval
 */
export class Services extends BasePage {

    public static NAME: string = 'admin-services';

    protected override _name: string = Services.NAME;

    /**
     * Auto-refresh handle; cleared in `unloadContent` so we don't
     * keep polling after the page is replaced.
     * @protected
     */
    protected _refreshTimer: ReturnType<typeof setInterval> | null = null;

    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Services'));

        // Top-right manual refresh — handy when the auto-poll interval
        // (5s) feels too slow during a debugging session.
        const btnRefresh = new ButtonDefault(card.getToolsElement(), undefined, 'fa fa-sync', ButtonClass.tool);
        btnRefresh.setOnClickFn(() => {
            if (this._onLoadTable) {
                this._onLoadTable();
            }
        });

        let allServices: ServiceInfoEntry[] = [];

        const tableWrapper = new TableWrapper<ServiceInfoEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Name'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Type'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Importance'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Status'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Scheduler'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Dependencies'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, entry: ServiceInfoEntry): void => {
            const trbody = new Tr(table.getTbody());

            // eslint-disable-next-line no-new
            new Td(trbody, `<b>${escapeHtml(entry.name)}</b>`);

            const typeTd = new Td(trbody, '');
            typeTd.append(entry.type === '1' ? 'scheduler' : 'runner');

            const imp = importanceLabel(entry.importance);
            const impTd = new Td(trbody, '');
            // eslint-disable-next-line no-new
            new Badge(impTd, imp.text, imp.badge);

            const statusTd = new Td(trbody, '');
            // eslint-disable-next-line no-new
            new Badge(statusTd, entry.status, statusBadge(entry.status));
            if (entry.inProcess) {
                statusTd.append(' <span class="text-info small"><i class="fas fa-spinner fa-spin"></i> running</span>');
            }
            if (entry.statusMsg && entry.statusMsg !== '') {
                statusTd.append(`<br><small class="text-muted">${escapeHtml(entry.statusMsg)}</small>`);
            }

            const schedTd = new Td(trbody, '');
            if (entry.scheduler) {
                const sched = entry.scheduler;
                schedTd.append(`<code class="small">${escapeHtml(sched.cron)}</code><br>`);
                const subBadge = statusBadge(sched.status);
                // eslint-disable-next-line no-new
                new Badge(schedTd, sched.status, subBadge);
                if (sched.inProcess) {
                    schedTd.append(' <span class="text-info small"><i class="fas fa-spinner fa-spin"></i> tick</span>');
                }
                if (sched.lastRun) {
                    const when = moment(sched.lastRun);
                    schedTd.append(`<br><small class="text-muted">last: ${when.format('HH:mm:ss')} (${when.fromNow()})</small>`);
                } else {
                    schedTd.append('<br><small class="text-muted">never run</small>');
                }
            } else {
                schedTd.append('<span class="text-muted">—</span>');
            }

            const depsTd = new Td(trbody, '');
            if (entry.dependencies.length === 0) {
                depsTd.append('<span class="text-muted">—</span>');
            } else {
                depsTd.append(entry.dependencies.map((d) => `<code class="small">${escapeHtml(d)}</code>`).join(' '));
            }

            const actionTd = new Td(trbody, '');
            const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

            // Invoke only makes sense for scheduler services — runners
            // are one-shot anyway, and the cluster of long-living ones
            // (HttpService, MariaDB) doesn't expose a useful invoke.
            if (entry.type === '1') {
                btnMenu.addMenuItem('Invoke now', async(): Promise<void> => {
                    try {
                        if (await ServiceAPI.invoke(entry.name)) {
                            this._toast.fire({icon: 'success', title: `${entry.name} invoked.`});
                        }
                    } catch (message) {
                        this._toast.fire({icon: 'error', title: message});
                    }
                    if (this._onLoadTable) {
                        await this._onLoadTable();
                    }
                }, 'fa fa-play');

                btnMenu.addDivider();
            }

            btnMenu.addMenuItem('Start', async(): Promise<void> => {
                try {
                    if (await ServiceAPI.start(entry.name)) {
                        this._toast.fire({icon: 'success', title: `${entry.name} started.`});
                    }
                } catch (message) {
                    this._toast.fire({icon: 'error', title: message});
                }
                if (this._onLoadTable) {
                    await this._onLoadTable();
                }
            }, 'fa fa-power-off');

            btnMenu.addMenuItem('Stop', (): void => {
                // Critical / important services get an extra confirmation
                // step — stopping MariaDBService while the cron is mid-tick
                // mangles state. Optional services skip it.
                const requireConfirm = entry.importance !== '0';
                const performStop = async(): Promise<void> => {
                    try {
                        if (await ServiceAPI.stop(entry.name)) {
                            this._toast.fire({icon: 'success', title: `${entry.name} stopped.`});
                        }
                    } catch (message) {
                        this._toast.fire({icon: 'error', title: message});
                    }
                    if (this._onLoadTable) {
                        await this._onLoadTable();
                    }
                };

                if (requireConfirm) {
                    DialogConfirm.confirm(
                        'dcStopService',
                        ModalDialogType.large,
                        `Stop ${entry.name}`,
                        `Stop the ${imp.text} service "${entry.name}"?`
                        + ' Dependent services will be stopped too. This affects the live backend.',
                        async(_, dialog) => {
                            await performStop();
                            dialog.hide();
                        },
                        undefined,
                        'Stop',
                        ButtonClass.danger
                    );
                } else {
                    performStop();
                }
            }, 'fa fa-stop');

            Lang.i().lAll();
        };

        const buildPage = (page: number): ServiceInfoEntry[] => {
            const offset = page * PAGE_SIZE;
            return allServices.slice(offset, offset + PAGE_SIZE);
        };

        this._onLoadTable = async(): Promise<void> => {
            try {
                allServices = await ServiceAPI.getStatus();
                card.setTitle(`Services (${allServices.length})`);
                await tableWrapper.reset();
            } finally {
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => buildPage(page),
            renderRow,
            false
        );

        await this._onLoadTable();

        // Poll while the page is mounted — every 5 s is fast enough
        // to see a manual invoke flip from `progress` → `success`
        // without spamming the backend.
        this._refreshTimer = setInterval(() => {
            if (this._onLoadTable) {
                this._onLoadTable();
            }
        }, AUTO_REFRESH_MS);
    }

    public override unloadContent(): void {
        if (this._refreshTimer !== null) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        super.unloadContent();
    }

}