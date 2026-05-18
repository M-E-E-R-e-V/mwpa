import {
    Badge,
    BadgeType,
    ButtonMenu,
    ButtonType,
    Card,
    ColumnContent,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    LeftNavbarLink,
    SortingColumn,
    SortOrder,
    Switch,
    Table,
    TableWrapper,
    Td,
    Th,
    Tr,
    UtilAvatarGenerator,
    UtilColor,
    UtilShorname
} from 'bambooo';
import {Group as GroupAPI} from '../Api/Group';
import {User as UserAPI, UserData, UserListFilter} from '../Api/User';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {UsersEditModal} from './Users/UsersEditModal';

const PAGE_SIZE = 30;

type SortKey = 'id' | 'username' | 'fullname' | 'group' | 'status' | 'admin';
type SortState = Record<SortKey, SortOrder>;

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlight = (text: string, term: string): string => {
    if (text === '') {
        return '';
    }
    const escaped = escapeHtml(text);
    if (term === '') {
        return escaped;
    }
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(safe, 'giu'), (match) => `<mark>${match}</mark>`);
};

const statusRank = (u: UserData): number => (u.disable ? 1 : 0);

/**
 * Users admin page — modern Sighting-style:
 *
 * - TableWrapper with infinite scroll (handy once we have more than
 *   a screen of users)
 * - Single-column sort across id / username / fullname / group / status / admin
 * - In-header quick search across username + fullname + email
 * - "Show disabled" toggle stays in the header — disabled users come
 *   from the backend only when the toggle is on, so client-side filter
 *   never reveals what the API decided to hide
 *
 * The whole page no longer rebuilds the DOM on save; `_onLoadTable`
 * just refetches + `tableWrapper.reset()`.
 */
export class Users extends BasePage {

    protected override _name: string = 'admin-users';

    protected _usersDialog: UsersEditModal;

    public constructor() {
        super();

        this._usersDialog = new UsersEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', async() => {
            const groups = await GroupAPI.getGroupList();

            this._usersDialog.resetValues();
            this._usersDialog.setTitle(new LangText('Add User'));

            if (groups && groups.list) {
                this._usersDialog.setMainGroupList(groups.list);
            }

            this._usersDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._usersDialog.setOnSave(async(): Promise<void> => {
            let tid = this._usersDialog.getId();
            if (tid === null) {
                tid = 0;
            }

            try {
                const aUser: UserData = {
                    id: tid,
                    username: this._usersDialog.getUsername(),
                    fullname: this._usersDialog.getFullname(),
                    email: this._usersDialog.getEMail(),
                    main_groupid: this._usersDialog.getMainGroup(),
                    isAdmin: this._usersDialog.getIsAdmin(),
                    disable: this._usersDialog.getIsDisabled()
                };

                const password = this._usersDialog.getPassword();
                const pin = this._usersDialog.getPin();

                if (password !== '') {
                    aUser.password = password;
                    aUser.password_repeat = this._usersDialog.getPasswordRepeat();
                }

                if (pin !== '') {
                    aUser.pin = pin;
                    aUser.pin_repeat = this._usersDialog.getPinRepeat();
                }

                if (await UserAPI.save(aUser)) {
                    this._usersDialog.hide();
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }
                    this._toast.fire({icon: 'success', title: 'User save success.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();

        const filter: UserListFilter = {filter: {show_disabled: false}};

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Users'));

        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new InputBottemBorderOnly2(searchSlot, undefined, InputType.text);
        searchInput.setPlaceholder(`${lang.l('search username / fullname / email …')}`);

        const sort: SortState = {
            id: SortOrder.NONE,
            username: SortOrder.ASC,
            fullname: SortOrder.NONE,
            group: SortOrder.NONE,
            status: SortOrder.NONE,
            admin: SortOrder.NONE
        };

        let searchTerm = '';
        let allUsers: UserData[] = [];
        let groupNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper<UserData>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        const sortRegistry: {key: SortKey; column: LangText}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangText => {
            const column = new LangText(label, undefined, (element) => {
                const newValue = SortingColumn.changeSort(element, sort[key]);

                for (const other of sortRegistry) {
                    if (other.key !== key) {
                        sort[other.key] = SortOrder.NONE;
                        SortingColumn.initSort(other.column, SortOrder.NONE);
                    }
                }

                sort[key] = newValue as SortOrder;
                tableWrapper.reset();
            });

            SortingColumn.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            makeSortColumn('Id', 'id'),
            new LangText('Avatar')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            makeSortColumn('Username', 'username'),
            makeSortColumn('Fullname', 'fullname')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('EMail'),
            makeSortColumn('Main-Group', 'group')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, makeSortColumn('Admin', 'admin'));

        // Disabled column: header doubles as "show disabled" filter switch.
        const thDisabled = new Th(trhead, makeSortColumn('Disabled', 'status'));
        const filterDisabled = new Switch(thDisabled, 'filterDisabled', 'Show all');
        if (filter.filter && filter.filter.show_disabled !== undefined) {
            filterDisabled.setEnable(filter.filter.show_disabled);
        }
        filterDisabled.getElement().css({'margin-bottom': '0'});
        filterDisabled.setChangeFn((value) => {
            if (filter.filter) {
                filter.filter.show_disabled = value;
            }
            if (this._onLoadTable) {
                this._onLoadTable();
            }
        });

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, user: UserData): void => {
            const trbody = new Tr(table.getTbody());
            const term = searchTerm;

            const avatarImg = UtilAvatarGenerator.generateAvatar(
                UtilShorname.getShortname(user.fullname),
                'white',
                UtilColor.getColor(user.username)
            );

            // eslint-disable-next-line no-new
            new Td(trbody, `#${user.id}<br><div class="image"><img src="${avatarImg}" class="img-circle elevation-2" alt="User Image" width="33px"></div>`);

            const tdName = new Td(trbody, '');
            tdName.getElement().html(
                `<b>${highlight(user.username, term)}</b><br>${highlight(user.fullname, term)}`
            );

            const groupName = groupNameById.get(user.main_groupid) ?? 'Unknown';
            const tdEmailGroup = new Td(trbody, '');
            tdEmailGroup.getElement().html(`${highlight(user.email, term)}<br>`);
            // eslint-disable-next-line no-new
            new Badge(tdEmailGroup, `<b>${escapeHtml(groupName)}</b>`, BadgeType.info);

            const tdAdmin = new Td(trbody, '');
            if (user.isAdmin) {
                // eslint-disable-next-line no-new
                new Badge(tdAdmin, lang.l('admin') ?? 'admin', BadgeType.warning);
            } else {
                tdAdmin.getElement().html('<span class="text-muted">—</span>');
            }

            const tdDisable = new Td(trbody, '');
            if (user.disable) {
                // eslint-disable-next-line no-new
                new Badge(tdDisable, lang.l('disabled') ?? 'disabled', BadgeType.danger);
            } else {
                // eslint-disable-next-line no-new
                new Badge(tdDisable, lang.l('active') ?? 'active', BadgeType.success);
            }

            const actionTd = new Td(trbody, '');
            const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

            btnMenu.addMenuItem('Edit', async(): Promise<void> => {
                const groups = await GroupAPI.getGroupList();

                this._usersDialog.resetValues();
                this._usersDialog.setTitle(new LangText('Edit User'));
                this._usersDialog.setId(user.id);
                this._usersDialog.setUsername(user.username);
                this._usersDialog.setFullname(user.fullname);
                this._usersDialog.setEMail(user.email);

                if (groups && groups.list) {
                    this._usersDialog.setMainGroupList(groups.list);
                }

                this._usersDialog.setMainGroup(user.main_groupid);
                this._usersDialog.setIsAdmin(user.isAdmin);
                this._usersDialog.setIsDisabled(user.disable);

                this._usersDialog.show();
            }, IconFa.edit);

            Lang.i().lAll();
        };

        // Filter + sort in-memory; backend returns the active set.
        const buildPage = (page: number): UserData[] => {
            const term = searchTerm.toLowerCase();

            const filtered = term === ''
                ? allUsers.slice()
                : allUsers.filter((u) => {
                    return u.username.toLowerCase().includes(term)
                        || u.fullname.toLowerCase().includes(term)
                        || u.email.toLowerCase().includes(term);
                });

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder.NONE);

            if (activeKey) {
                const order = sort[activeKey];
                const dir = order === SortOrder.DESC ? -1 : 1;
                filtered.sort((a, b) => {
                    let av: string | number;
                    let bv: string | number;

                    switch (activeKey) {
                        case 'id':
                            av = a.id;
                            bv = b.id;
                            break;
                        case 'username':
                            av = a.username.toLowerCase();
                            bv = b.username.toLowerCase();
                            break;
                        case 'fullname':
                            av = a.fullname.toLowerCase();
                            bv = b.fullname.toLowerCase();
                            break;
                        case 'group':
                            av = (groupNameById.get(a.main_groupid) ?? '').toLowerCase();
                            bv = (groupNameById.get(b.main_groupid) ?? '').toLowerCase();
                            break;
                        case 'status':
                            av = statusRank(a);
                            bv = statusRank(b);
                            break;
                        case 'admin':
                            av = a.isAdmin ? 0 : 1;
                            bv = b.isAdmin ? 0 : 1;
                            break;
                    }

                    if (av < bv) return -1 * dir;
                    if (av > bv) return 1 * dir;
                    return 0;
                });
            }

            const offset = page * PAGE_SIZE;
            return filtered.slice(offset, offset + PAGE_SIZE);
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            try {
                const [users, groups] = await Promise.all([
                    UserAPI.getUserList(filter),
                    GroupAPI.getGroupList()
                ]);

                allUsers = users ?? [];

                groupNameById = new Map<number, string>();
                if (groups && groups.list) {
                    for (const g of groups.list) {
                        groupNameById.set(g.id, g.description);
                    }
                }

                card.setTitle(`Users (${allUsers.length})`);
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

        let searchTimer: ReturnType<typeof setTimeout> | null = null;
        searchInput.getElement().on('keyup', () => {
            if (searchTimer !== null) {
                clearTimeout(searchTimer);
            }

            searchTimer = setTimeout(() => {
                const value = searchInput.getValue().trim();
                if (value === searchTerm) {
                    return;
                }
                searchTerm = value;
                tableWrapper.reset();
            }, 300);
        });

        this._onLoadTable();
    }

}