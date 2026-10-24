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
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tr2
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

        const content = this._wrapper.getContentWrapper().getContent();

        const row1 = new ContentRow2(content.getElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Blacklist (blocked IPs)'}));

        const tableWrapper = new TableWrapper2<BlacklistEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        new Th2({value: new LangTextV2({text: 'IP'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Count'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'First blocked'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Last blocked'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Last path'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Browser'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'OS'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Hostname'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Action'})}).appendTo(trhead);

        const renderRow = (_table: Table2, entry: BlacklistEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());

            new Td2({value: entry.ip}).appendTo(trbody);
            new Td2({value: `${entry.count}`}).appendTo(trbody);
            new Td2({value: Blacklist._fmtTs(entry.first_blocked)}).appendTo(trbody);
            new Td2({value: Blacklist._fmtTs(entry.last_blocked)}).appendTo(trbody);
            new Td2({value: entry.last_path}).appendTo(trbody);
            new Td2({value: entry.browser}).appendTo(trbody);
            new Td2({value: entry.os}).appendTo(trbody);
            new Td2({value: entry.hostname}).appendTo(trbody);

            const actionTd = new Td2({value: ''});
            actionTd.appendTo(trbody);
            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actionTd);

            btnMenu.addMenuItem('Unblock', (): void => {
                DialogConfirm2.confirm(
                    'dcUnblockIp',
                    ModalDialogType2.large,
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
                    ButtonClass2.danger
                );
            }, IconFa.trash);

            Lang.i().lAll();
        };

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

        this._onLoadTable = async(): Promise<void> => {
            await tableWrapper.reset();
        };

        /*
         * Login lockouts (Sperrliste) — (account, device) pairs locked out after
         * too many failed mobile logins. Backed by the in-memory
         * LoginLockoutRegistry; entries expire when the lock elapses.
         */

        const row2 = new ContentRow2(content.getElement());
        const lockCard = new Card2({});
        lockCard.appendTo(new ContentCol2(row2, ContentColSize2.col12).getElement());
        lockCard.setTitle(new LangTextV2({text: 'Login lockouts'}));

        const lockTableWrapper = new TableWrapper2<LoginLockoutEntry>({tableOptions: {head_fixed: true}});
        lockTableWrapper.appendTo(lockCard.getElement());
        const lockTable = lockTableWrapper.getTable();
        const lockHead = new Tr2();
        lockHead.appendTo(lockTable.getThead());

        for (const label of ['Email', 'Device', 'Count', 'First attempt', 'Last attempt', 'Locked until', 'Browser', 'OS', 'Action']) {
            new Th2({value: new LangTextV2({text: label})}).appendTo(lockHead);
        }

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
            (_table: Table2, entry: LoginLockoutEntry): void => {
                const trbody = new Tr2();
                trbody.appendTo(lockTable.getTbody());
                const device = entry.device.length > 14 ? `${entry.device.slice(0, 14)}…` : entry.device;

                new Td2({value: entry.email}).appendTo(trbody);
                new Td2({value: device}).appendTo(trbody);
                new Td2({value: `${entry.count}`}).appendTo(trbody);
                new Td2({value: Blacklist._fmtTs(entry.first_attempt)}).appendTo(trbody);
                new Td2({value: Blacklist._fmtTs(entry.last_attempt)}).appendTo(trbody);
                new Td2({value: Blacklist._fmtTs(entry.locked_until)}).appendTo(trbody);
                new Td2({value: entry.browser}).appendTo(trbody);
                new Td2({value: entry.os}).appendTo(trbody);

                const actionTd = new Td2({value: ''});
                actionTd.appendTo(trbody);
                const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
                btnMenu.appendTo(actionTd);

                btnMenu.addMenuItem('Unlock', (): void => {
                    DialogConfirm2.confirm(
                        'dcUnlockLogin',
                        ModalDialogType2.large,
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
                            await lockTableWrapper.reset();
                        },
                        undefined,
                        'Unlock',
                        ButtonClass2.danger
                    );
                }, IconFa.trash);

                Lang.i().lAll();
            },
            false
        );
    }

}