import {
    ButtonClass,
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
import {Blacklist as BlacklistAPI, BlacklistEntry, LoginLockoutEntry} from '../Api/Blacklist';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

/**
 * Admin → Blacklist page — the IPs the rate limiter is currently blocking,
 * with the client's browser / OS / reverse-DNS hostname and an unblock action.
 *
 * Backed by the backend in-memory RateLimitRegistry; entries auto-expire after
 * the limiter window (15 min). Logged-in users are never rate-limited (figtree
 * skips the limiter for an authenticated session), so this view lists
 * unauthenticated clients that hit the limit — typically brute-force attempts
 * on /login.
 */
export class Blacklist extends BasePage {

    /**
     * name — must match the sidebar menu entry name.
     * @protected
     */
    protected override _name: string = 'admin-blacklist';

    /**
     * Format an epoch-ms timestamp for a table cell.
     * @param {number} ms
     * @return {string}
     * @protected
     */
    protected static _fmtTs(ms: number): string {
        const m = moment(ms);

        return m.isValid() ? m.format('DD.MM.YYYY HH:mm:ss') : '';
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const lang = Lang.i();

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Blacklist (blocked IPs)'));

        const tableWrapper = new TableWrapper<BlacklistEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('IP'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Count'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('First blocked'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Last blocked'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Last path'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Browser'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('OS'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Hostname'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, entry: BlacklistEntry): void => {
            const trbody = new Tr(table.getTbody());

            // eslint-disable-next-line no-new
            new Td(trbody, entry.ip);
            // eslint-disable-next-line no-new
            new Td(trbody, `${entry.count}`);
            // eslint-disable-next-line no-new
            new Td(trbody, Blacklist._fmtTs(entry.first_blocked));
            // eslint-disable-next-line no-new
            new Td(trbody, Blacklist._fmtTs(entry.last_blocked));
            // eslint-disable-next-line no-new
            new Td(trbody, entry.last_path);
            // eslint-disable-next-line no-new
            new Td(trbody, entry.browser);
            // eslint-disable-next-line no-new
            new Td(trbody, entry.os);
            // eslint-disable-next-line no-new
            new Td(trbody, entry.hostname);

            const actionTd = new Td(trbody, '');
            const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

            btnMenu.addMenuItem('Unblock', (): void => {
                DialogConfirm.confirm(
                    'dcUnblockIp',
                    ModalDialogType.large,
                    'Unblock IP',
                    `Unblock ${entry.ip}? This resets the rate limiter for this IP immediately.`,
                    async(_, dialog) => {
                        try {
                            if (await BlacklistAPI.unblock(entry.ip)) {
                                this._toast.fire({icon: 'success', title: 'IP unblocked.'});
                            } else {
                                this._toast.fire({icon: 'info', title: 'IP was no longer blocked.'});
                            }
                        } catch (message) {
                            this._toast.fire({icon: 'error', title: message});
                        }

                        dialog.hide();

                        if (this._onLoadTable) {
                            this._onLoadTable();
                        }
                    },
                    undefined,
                    'Unblock',
                    ButtonClass.danger
                );
            }, IconFa.trash);

            Lang.i().lAll();
        };

        this._onLoadTable = async(): Promise<void> => {
            tableWrapper.setDataSource(
                async(page) => {
                    if (page !== 0) {
                        return [];
                    }

                    let list: BlacklistEntry[] = [];

                    try {
                        list = await BlacklistAPI.getList();
                    } catch (message) {
                        this._toast.fire({icon: 'error', title: message});
                    }

                    card.setTitle(`${lang.l('Blacklist (blocked IPs)') ?? 'Blacklist (blocked IPs)'} (${list.length})`);

                    return list;
                },
                renderRow,
                false
            );
        };

        this._onLoadTable();

        /*
         * Login lockouts (Sperrliste) — (account, device) pairs locked out after
         * too many failed mobile logins. Backed by the in-memory
         * LoginLockoutRegistry; entries expire when the lock elapses.
         */

        const row2 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const lockCard = new Card(new ContentCol(row2, ContentColSize.col12));
        lockCard.setTitle(new LangText('Login lockouts'));

        const lockTableWrapper = new TableWrapper<LoginLockoutEntry>(lockCard.getElement(), {head_fixed: true});
        const lockTable = lockTableWrapper.getTable();
        const lockHead = new Tr(lockTable.getThead());

        for (const label of ['Email', 'Device', 'Count', 'First attempt', 'Last attempt', 'Locked until', 'Browser', 'OS', 'Action']) {
            // eslint-disable-next-line no-new
            new Th(lockHead, new LangText(label));
        }

        const loadLockoutTable = async(): Promise<void> => {
            lockTableWrapper.setDataSource(
                async(page) => {
                    if (page !== 0) {
                        return [];
                    }

                    let list: LoginLockoutEntry[] = [];

                    try {
                        list = await BlacklistAPI.getLockoutList();
                    } catch (message) {
                        this._toast.fire({icon: 'error', title: message});
                    }

                    lockCard.setTitle(`${lang.l('Login lockouts') ?? 'Login lockouts'} (${list.length})`);

                    return list;
                },
                (_table: Table, entry: LoginLockoutEntry): void => {
                    const trbody = new Tr(lockTable.getTbody());
                    const device = entry.device.length > 14 ? `${entry.device.slice(0, 14)}…` : entry.device;

                    // eslint-disable-next-line no-new
                    new Td(trbody, entry.email);
                    // eslint-disable-next-line no-new
                    new Td(trbody, device);
                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.count}`);
                    // eslint-disable-next-line no-new
                    new Td(trbody, Blacklist._fmtTs(entry.first_attempt));
                    // eslint-disable-next-line no-new
                    new Td(trbody, Blacklist._fmtTs(entry.last_attempt));
                    // eslint-disable-next-line no-new
                    new Td(trbody, Blacklist._fmtTs(entry.locked_until));
                    // eslint-disable-next-line no-new
                    new Td(trbody, entry.browser);
                    // eslint-disable-next-line no-new
                    new Td(trbody, entry.os);

                    const actionTd = new Td(trbody, '');
                    const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

                    btnMenu.addMenuItem('Unlock', (): void => {
                        DialogConfirm.confirm(
                            'dcUnlockLogin',
                            ModalDialogType.large,
                            'Unlock login',
                            `Unlock ${entry.email} on this device? They can log in again immediately.`,
                            async(_, dialog) => {
                                try {
                                    if (await BlacklistAPI.unblockLockout(entry.key)) {
                                        this._toast.fire({icon: 'success', title: 'Login unlocked.'});
                                    } else {
                                        this._toast.fire({icon: 'info', title: 'Lockout was no longer active.'});
                                    }
                                } catch (message) {
                                    this._toast.fire({icon: 'error', title: message});
                                }

                                dialog.hide();
                                await loadLockoutTable();
                            },
                            undefined,
                            'Unlock',
                            ButtonClass.danger
                        );
                    }, IconFa.trash);

                    Lang.i().lAll();
                },
                false
            );
        };

        await loadLockoutTable();
    }

}