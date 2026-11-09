import {
    ButtonClass2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    DialogConfirm2,
    IconFa,
    LangTextV2,
    ModalDialogType2,
    SortingColumn2,
    SortOrder2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tr2
} from 'bambooo';
import moment from 'moment';
import {Service as ServiceAPI, ServiceInfoEntry} from '../Api/Service';
import {Lang} from '../Lang';
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';

/**
 * Overall state of a service (service + its scheduler combined)
 */
type ServiceState = 'ok' | 'busy' | 'error' | 'inactive';

/**
 * Sortable columns
 */
type SortKey = 'name' | 'importance' | 'state' | 'lastRun';

/**
 * Sort state per column
 */
type SortState = Record<SortKey, SortOrder2>;

/**
 * Toolbar filter state
 */
type ServiceFilter = {
    term: string;
    type: string;
    state: string;
};

/**
 * Service-Manager admin page, same look as the other admin lists (see
 * {@link AdminListUi}).
 *
 * Reads `/json/v1/service/status` every 5 s while the page is open (can be
 * switched off; polling also pauses while an action menu is open so it
 * doesn't close under the cursor). Per service: type, importance, combined
 * state (service + scheduler), schedule as readable text with last run, and
 * dependencies. Actions: "Invoke now" for scheduler services (fires the cron
 * tick immediately), Start / Stop in the menu (figtree's ServiceManager
 * handles the dependency order; stopping an important service asks first).
 */
export class Services extends BasePage {

    public static NAME: string = 'admin-services';

    /**
     * Rows per TableWrapper page
     * @protected
     */
    protected static readonly _PAGE_SIZE = 50;

    /**
     * Auto-refresh interval
     * @protected
     */
    protected static readonly _AUTO_REFRESH_MS = 5000;

    protected override _name: string = Services.NAME;

    /**
     * Auto-refresh handle; cleared in `unloadContent` so we don't
     * keep polling after the page is replaced.
     * @protected
     */
    protected _refreshTimer: ReturnType<typeof setInterval> | null = null;

    /**
     * Combined state of service + scheduler.
     * @param {ServiceInfoEntry} entry
     * @return {ServiceState}
     * @protected
     */
    protected static _state(entry: ServiceInfoEntry): ServiceState {
        if (entry.status === 'error' || entry.scheduler?.status === 'error') {
            return 'error';
        }

        if (entry.inProcess || entry.scheduler?.inProcess === true || entry.status === 'progress') {
            return 'busy';
        }

        if (entry.status === 'none') {
            return 'inactive';
        }

        return 'ok';
    }

    /**
     * Pill label, tone and icon of a state.
     * @param {ServiceState} state
     * @return {{label: string; tone: 'success'|'primary'|'danger'|'secondary'; icon: string;}}
     * @protected
     */
    protected static _stateInfo(state: ServiceState): {
        label: string;
        tone: 'success' | 'primary' | 'danger' | 'secondary';
        icon: string;
    } {
        switch (state) {
            case 'error':
                return {label: 'Error', tone: 'danger', icon: 'fas fa-exclamation-triangle'};

            case 'busy':
                return {label: 'Working', tone: 'primary', icon: 'fas fa-spinner fa-spin'};

            case 'inactive':
                return {label: 'Inactive', tone: 'secondary', icon: 'fas fa-pause'};

            default:
                return {label: 'OK', tone: 'success', icon: 'fas fa-check'};
        }
    }

    /**
     * Importance label + tone (figtree `ServiceImportance` "0"/"1"/"2").
     * @param {string} importance
     * @return {{label: string; tone: 'danger'|'warning'|'secondary';}}
     * @protected
     */
    protected static _importance(importance: string): {label: string; tone: 'danger' | 'warning' | 'secondary';} {
        switch (importance) {
            case '2':
                return {label: 'critical', tone: 'danger'};

            case '1':
                return {label: 'important', tone: 'warning'};

            default:
                return {label: 'optional', tone: 'secondary'};
        }
    }

    /**
     * Readable text for the common cron shapes, '' for anything else
     * (the raw expression is always shown as well).
     * @param {string} cron
     * @return {string}
     * @protected
     */
    protected static _cronText(cron: string): string {
        const lang = Lang.i();
        const parts = cron.trim().split(/\s+/u);

        if (parts.length !== 5 || parts[2] !== '*' || parts[3] !== '*' || parts[4] !== '*') {
            return '';
        }

        const [minute, hour] = parts;
        const every = minute.startsWith('*/') ? minute.slice(2) : '';

        if (hour === '*' && (/^\d+$/u).test(every)) {
            return lang.l('every %d minutes').replace('%d', every);
        }

        if (!(/^\d+$/u).test(minute)) {
            return '';
        }

        const mm = minute.padStart(2, '0');

        if (hour === '*') {
            return lang.l('hourly at :%s').replace('%s', mm);
        }

        if ((/^\d+$/u).test(hour)) {
            return lang.l('daily at %s').replace('%s', `${hour.padStart(2, '0')}:${mm}`);
        }

        return '';
    }

    /**
     * Translated "how long ago" for a timestamp (moment's `fromNow()`
     * is English only here — no moment locale is loaded).
     * @param {number} ms epoch milliseconds
     * @return {string}
     * @protected
     */
    protected static _ago(ms: number): string {
        const lang = Lang.i();
        const minutes = Math.max(0, Math.floor((Date.now() - ms) / 60000));

        if (minutes < 1) {
            return lang.l('just now');
        }

        if (minutes < 60) {
            return lang.l('%d min ago').replace('%d', `${minutes}`);
        }

        const hours = Math.floor(minutes / 60);

        if (hours < 48) {
            return lang.l('%d h ago').replace('%d', `${hours}`);
        }

        return lang.l('%d days ago').replace('%d', `${Math.floor(hours / 24)}`);
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();

        const content = this._wrapper.getContentWrapper().getContent();
        const row = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Services'}));

        const filter: ServiceFilter = {
            term: '',
            type: '0',
            state: '0'
        };

        let allServices: ServiceInfoEntry[] = [];
        let filteredServices: ServiceInfoEntry[] = [];
        let autoRefresh = true;

        // assigned below, used by the toolbar + sort handlers
        let applyFilter: (() => void) | null = null;

        // toolbar -----------------------------------------------------------------------------------------------------

        const toolbar = AdminListUi.toolbar(card.getElement());

        AdminListUi.search(toolbar, 'Search service, dependency or message …', (term): void => {
            filter.term = term;
            applyFilter?.();
        });

        const typeSelect = AdminListUi.select(toolbar, 'All types', (value): void => {
            filter.type = value;
            applyFilter?.();
        });

        AdminListUi.setOptions(typeSelect, [
            {value: '1', label: lang.l('Scheduler')},
            {value: 'runner', label: lang.l('Runner')}
        ]);

        const stateSelect = AdminListUi.select(toolbar, 'Any status', (value): void => {
            filter.state = value;
            applyFilter?.();
        });

        AdminListUi.setOptions(stateSelect, [
            {value: 'ok', label: lang.l('OK')},
            {value: 'busy', label: lang.l('Working')},
            {value: 'error', label: lang.l('Error')},
            {value: 'inactive', label: lang.l('Inactive')}
        ]);

        AdminListUi.switch(toolbar, 'mwpa-services-auto-refresh', 'Auto refresh (5 s)', (checked): void => {
            autoRefresh = checked;
        }).prop('checked', true);

        const btnRefresh = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary"/>')
        .attr('title', lang.l('Refresh'))
        .appendTo(toolbar);
        jQuery('<i class="fas fa-sync-alt"/>').appendTo(btnRefresh);
        btnRefresh.on('click', (): void => {
            this._onLoadTable?.();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);
        const updatedInfo = jQuery('<span class="small text-body-tertiary"/>').appendTo(toolbar);
        const stats = AdminListUi.statsRow(card.getElement());

        // table -------------------------------------------------------------------------------------------------------

        const sort: SortState = {
            name: SortOrder2.NONE,
            importance: SortOrder2.NONE,
            state: SortOrder2.NONE,
            lastRun: SortOrder2.NONE
        };

        const tableWrapper = new TableWrapper2<ServiceInfoEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No services match the current filter.');
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
        new Th2({value: makeSortColumn('Service', 'name')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Status', 'state')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Importance', 'importance')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Schedule', 'lastRun')}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Dependencies'})}).appendTo(trhead);
        new Th2({value: ''}).appendTo(trhead);

        const reload = async(): Promise<void> => {
            await this._onLoadTable?.();
        };

        const invoke = async(entry: ServiceInfoEntry): Promise<void> => {
            try {
                if (await ServiceAPI.invoke(entry.name)) {
                    this._toast.fire({icon: 'success', title: `${entry.name}: ${lang.l('invoked.')}`});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }

            await reload();
        };

        const start = async(entry: ServiceInfoEntry): Promise<void> => {
            try {
                if (await ServiceAPI.start(entry.name)) {
                    this._toast.fire({icon: 'success', title: `${entry.name}: ${lang.l('started.')}`});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }

            await reload();
        };

        const stop = (entry: ServiceInfoEntry): void => {
            const performStop = async(): Promise<void> => {
                try {
                    if (await ServiceAPI.stop(entry.name)) {
                        this._toast.fire({icon: 'success', title: `${entry.name}: ${lang.l('stopped.')}`});
                    }
                } catch (message) {
                    this._toast.fire({icon: 'error', title: message});
                }

                await reload();
            };

            /*
             * Critical / important services get an extra confirmation step —
             * stopping MariaDBService while the cron is mid-tick mangles state.
             */
            if (entry.importance === '0') {
                performStop();
                return;
            }

            DialogConfirm2.confirm(
                'dcStopService',
                ModalDialogType2.large,
                `${lang.l('Stop service')} ${entry.name}`,
                `${lang.l('Stop the service "%s"?').replace('%s', AdminListUi.escape(entry.name))} ${lang.l('Dependent services will be stopped too. This affects the live backend.')}`,
                async(_, dialog) => {
                    await performStop();
                    dialog.hide();
                },
                undefined,
                lang.l('Stop'),
                ButtonClass2.danger
            );
        };

        const renderRow = (_table: Table2, entry: ServiceInfoEntry): void => {
            const term = filter.term;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            const state = Services._state(entry);
            const info = Services._stateInfo(state);
            const isScheduler = entry.type === '1';

            if (state === 'inactive') {
                tr.getElement().addClass('opacity-75');
            }

            // icon
            const tdIcon = new Td2({value: ''});
            tdIcon.appendTo(tr);
            const icon = jQuery('<div class="rounded-circle d-flex align-items-center justify-content-center"/>')
            .css({width: '36px', height: '36px'})
            .addClass(`bg-${info.tone}-subtle text-${info.tone}-emphasis`)
            .appendTo(tdIcon.getElement());
            jQuery('<i/>').addClass(isScheduler ? 'far fa-clock' : 'fas fa-cog').appendTo(icon);

            // name + type + message
            const tdName = new Td2({value: ''});
            tdName.appendTo(tr);
            jQuery('<div class="fw-semibold font-monospace"/>').html(AdminListUi.highlight(entry.name, term)).appendTo(tdName.getElement());
            jQuery('<div class="small text-body-secondary"/>')
            .text(isScheduler ? lang.l('Scheduler') : lang.l('Runner'))
            .appendTo(tdName.getElement());

            if (entry.statusMsg !== '') {
                jQuery('<div class="small"/>')
                .addClass(state === 'error' ? 'text-danger' : 'text-body-secondary fst-italic')
                .html(AdminListUi.highlight(entry.statusMsg, term))
                .appendTo(tdName.getElement());
            }

            // state
            const tdState = new Td2({value: ''});
            tdState.appendTo(tr);
            AdminListUi.pill(tdState.getElement(), info.label, info.tone, info.icon);

            // importance
            const tdImportance = new Td2({value: ''});
            tdImportance.appendTo(tr);
            const imp = Services._importance(entry.importance);
            AdminListUi.pill(tdImportance.getElement(), imp.label, imp.tone);

            // schedule
            const tdSchedule = new Td2({value: ''});
            tdSchedule.appendTo(tr);

            if (entry.scheduler) {
                const sched = entry.scheduler;
                const text = Services._cronText(sched.cron);
                const line = jQuery('<div/>').appendTo(tdSchedule.getElement());

                if (text !== '') {
                    jQuery('<span class="me-2"/>').text(text).appendTo(line);
                }

                jQuery('<code class="small text-body-secondary"/>').text(sched.cron).appendTo(line);

                const last = jQuery('<div class="small text-body-secondary"/>').appendTo(tdSchedule.getElement());

                if (sched.inProcess) {
                    jQuery('<i class="fas fa-spinner fa-spin me-1 text-primary"/>').appendTo(last);
                    jQuery('<span/>').text(lang.l('tick running …')).appendTo(last);
                } else if (sched.lastRun) {
                    const when = moment(sched.lastRun);
                    jQuery('<span/>')
                    .text(`${lang.l('last run')} ${Services._ago(when.valueOf())}`)
                    .attr('title', when.format('YYYY.MM.DD HH:mm:ss'))
                    .appendTo(last);

                    if (sched.status === 'error') {
                        jQuery('<span class="text-danger ms-1"/>').text(`(${lang.l('failed')})`).appendTo(last);
                    }
                } else {
                    jQuery('<span/>').text(lang.l('never run')).appendTo(last);
                }
            } else {
                jQuery('<span class="small text-body-secondary"/>')
                .text(state === 'inactive' ? lang.l('not running') : lang.l('runs continuously'))
                .appendTo(tdSchedule.getElement());
            }

            // dependencies
            const tdDeps = new Td2({value: ''});
            tdDeps.appendTo(tr);

            if (entry.dependencies.length === 0) {
                jQuery('<span class="small text-body-tertiary"/>').text('—').appendTo(tdDeps.getElement());
            } else {
                const deps = jQuery('<div class="d-flex flex-wrap gap-1"/>').appendTo(tdDeps.getElement());

                for (const dep of entry.dependencies) {
                    jQuery('<code class="small"/>').html(AdminListUi.highlight(dep, term)).appendTo(deps);
                }
            }

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);
            const actions = jQuery('<div class="d-flex justify-content-end align-items-center gap-1"/>').appendTo(tdAction.getElement());

            if (isScheduler) {
                const btnInvoke = jQuery('<button type="button" class="btn btn-sm btn-outline-primary"/>')
                .attr('title', lang.l('Invoke now'))
                .prop('disabled', state === 'busy' || state === 'inactive')
                .appendTo(actions);
                jQuery('<i class="fas fa-play"/>').appendTo(btnInvoke);
                btnInvoke.on('click', (): void => {
                    btnInvoke.prop('disabled', true);
                    invoke(entry);
                });
            }

            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actions);

            if (isScheduler) {
                btnMenu.addMenuItem(lang.l('Invoke now'), (): void => {
                    invoke(entry);
                }, 'fas fa-play');
                btnMenu.addDivider();
            }

            btnMenu.addMenuItem(lang.l('Start'), (): void => {
                start(entry);
            }, 'fas fa-power-off');

            btnMenu.addMenuItem(lang.l('Stop'), (): void => {
                stop(entry);
            }, 'fas fa-stop');
        };

        // filter + sort -----------------------------------------------------------------------------------------------

        const stateOrder: Record<ServiceState, number> = {error: 0, busy: 1, ok: 2, inactive: 3};

        const sortValue = (entry: ServiceInfoEntry, key: SortKey): string | number => {
            switch (key) {
                case 'name':
                    return entry.name.toLowerCase();

                case 'importance':
                    return parseInt(entry.importance, 10) || 0;

                case 'state':
                    return stateOrder[Services._state(entry)];

                case 'lastRun':
                    return entry.scheduler?.lastRun ? moment(entry.scheduler.lastRun).valueOf() : 0;
            }

            return 0;
        };

        const matches = (entry: ServiceInfoEntry): boolean => {
            if (filter.type === '1' && entry.type !== '1') {
                return false;
            }

            if (filter.type === 'runner' && entry.type === '1') {
                return false;
            }

            if (filter.state !== '0' && Services._state(entry) !== filter.state) {
                return false;
            }

            const term = filter.term.toLowerCase();

            if (term === '') {
                return true;
            }

            return [entry.name, entry.statusMsg, ...entry.dependencies].some((value) => value.toLowerCase().includes(term));
        };

        applyFilter = (): void => {
            filteredServices = allServices.filter(matches);

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const dir = sort[activeKey] === SortOrder2.DESC ? -1 : 1;

                filteredServices.sort((a, b) => {
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

            AdminListUi.setResult(resultInfo, filteredServices.length, allServices.length);
            AdminListUi.setEmpty(emptyInfo, filteredServices.length === 0);
            tableWrapper.reset().then((): void => {
                Lang.i().lAll();
            });
        };

        const renderStats = (): void => {
            stats.empty();

            const count = (state: ServiceState): number => allServices.filter((s) => Services._state(s) === state).length;
            const errors = count('error');
            const busy = count('busy');
            const inactive = count('inactive');

            AdminListUi.stat(stats, 'fas fa-cogs', `${allServices.length}`, 'Services', 'text-primary');
            AdminListUi.stat(stats, 'fas fa-check', `${count('ok')}`, 'OK', 'text-success');
            AdminListUi.stat(stats, 'fas fa-spinner', `${busy}`, 'Working', busy > 0 ? 'text-primary' : 'text-body-secondary');
            AdminListUi.stat(stats, 'fas fa-exclamation-triangle', `${errors}`, 'Error', errors > 0 ? 'text-danger' : 'text-body-secondary');
            AdminListUi.stat(stats, 'fas fa-pause', `${inactive}`, 'Inactive', inactive > 0 ? 'text-warning' : 'text-body-secondary');
            AdminListUi.stat(
                stats,
                'far fa-clock',
                `${allServices.filter((s) => s.type === '1').length}`,
                'Scheduler'
            );
        };

        this._onLoadTable = async(): Promise<void> => {
            try {
                allServices = await ServiceAPI.getStatus();
                card.setTitle(`${lang.l('Services')} (${allServices.length})`);
                updatedInfo.text(`${lang.l('Updated')} ${moment().format('HH:mm:ss')}`);
                renderStats();
                applyFilter?.();
            } finally {
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => {
                const offset = page * Services._PAGE_SIZE;
                return filteredServices.slice(offset, offset + Services._PAGE_SIZE);
            },
            renderRow,
            false
        );

        await this._onLoadTable();

        /*
         * Poll while the page is mounted — every 5 s is fast enough to see a
         * manual invoke flip from `progress` → `success`. Skipped while an
         * action menu or dialog is open, so it doesn't vanish under the cursor.
         */
        this._refreshTimer = setInterval((): void => {
            if (!autoRefresh) {
                return;
            }

            if (card.getElement().find('.dropdown-menu.show').length > 0 || jQuery('.modal.show').length > 0) {
                return;
            }

            this._onLoadTable?.();
        }, Services._AUTO_REFRESH_MS);
    }

    public override async unloadContent(): Promise<void> {
        if (this._refreshTimer !== null) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }

        await super.unloadContent();
    }

}