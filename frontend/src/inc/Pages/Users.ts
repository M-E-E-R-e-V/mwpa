import {
    Badge2,
    BadgeType2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    IconFa,
    Input2,
    InputType2,
    LangTextV2,
    LeftNavbarLink,
    SortingColumn2,
    SortOrder2,
    Switch2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tr2,
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
type SortState = Record<SortKey, SortOrder2>;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

const highlight = (text: string, term: string): string => {
    if (text === '') {
        return '';
    }
    const escaped = escapeHtml(text);
    if (term === '') {
        return escaped;
    }
    const safe = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return escaped.replace(new RegExp(safe, 'giu'), (match) => `<mark>${match}</mark>`);
};

const statusRank = (u: UserData): number => u.disable ? 1 : 0;

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

        this._usersDialog = new UsersEditModal();

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', async() => {
            const groups = await GroupAPI.getGroupList();

            this._usersDialog.resetValues();
            this._usersDialog.setTitle(new LangTextV2({text: 'Add User'}));

            if (groups && groups.list) {
                this._usersDialog.setMainGroupList(groups.list);
            }

            this._usersDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._usersDialog.setOnSave(async(): Promise<void> => {
            let tid = this._usersDialog.getUserId();
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

        const content = this._wrapper.getContentWrapper().getContent();
        const row1 = new ContentRow2(content.getElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Users'}));

        const searchSlot = jQuery('<div class="sighting-quick-search"/>').insertAfter(card.getTitleElement());
        const searchInput = new Input2({type: InputType2.text});
        searchInput.appendTo(searchSlot);
        searchInput.setPlaceholder(`${lang.l('search username / fullname / email …')}`);

        const sort: SortState = {
            id: SortOrder2.NONE,
            username: SortOrder2.ASC,
            fullname: SortOrder2.NONE,
            group: SortOrder2.NONE,
            status: SortOrder2.NONE,
            admin: SortOrder2.NONE
        };

        let searchTerm = '';
        let allUsers: UserData[] = [];
        let groupNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper2<UserData>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        const sortRegistry: {key: SortKey; column: LangTextV2;}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangTextV2 => {
            const column = new LangTextV2({
                text: label,
                onClick: (langText): void => {
                    const newValue = SortingColumn2.changeSort(langText, sort[key]);

                    for (const other of sortRegistry) {
                        if (other.key !== key) {
                            sort[other.key] = SortOrder2.NONE;
                            SortingColumn2.initSort(other.column, SortOrder2.NONE);
                        }
                    }

                    sort[key] = newValue as SortOrder2;
                    tableWrapper.reset();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        const thIdAvatar = new Th2({});
        thIdAvatar.addComponent(makeSortColumn('Id', 'id'));
        thIdAvatar.append('<br>');
        thIdAvatar.addComponent(new LangTextV2({text: 'Avatar'}));
        thIdAvatar.appendTo(trhead);

        const thName = new Th2({});
        thName.addComponent(makeSortColumn('Username', 'username'));
        thName.append('<br>');
        thName.addComponent(makeSortColumn('Fullname', 'fullname'));
        thName.appendTo(trhead);

        const thEmailGroup = new Th2({});
        thEmailGroup.addComponent(new LangTextV2({text: 'EMail'}));
        thEmailGroup.append('<br>');
        thEmailGroup.addComponent(makeSortColumn('Main-Group', 'group'));
        thEmailGroup.appendTo(trhead);

        new Th2({value: makeSortColumn('Admin', 'admin')}).appendTo(trhead);

        // Disabled column: header doubles as "show disabled" filter switch.
        const thDisabled = new Th2({value: makeSortColumn('Disabled', 'status')});
        thDisabled.appendTo(trhead);
        const filterDisabled = new Switch2({label: 'Show all'});
        filterDisabled.appendTo(thDisabled);
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

        new Th2({value: new LangTextV2({text: 'Action'})}).appendTo(trhead);

        const renderRow = (_table: Table2, user: UserData): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());
            const term = searchTerm;

            const avatarImg = UtilAvatarGenerator.generateAvatar(
                UtilShorname.getShortname(user.fullname),
                'white',
                UtilColor.getColor(user.username)
            );

            new Td2({
                value: `#${user.id}<br><div class="image"><img src="${avatarImg}" class="img-circle elevation-2" alt="User Image" width="33px"></div>`
            }).appendTo(trbody);

            const tdName = new Td2({value: ''});
            tdName.appendTo(trbody);
            tdName.getElement().html(
                `<b>${highlight(user.username, term)}</b><br>${highlight(user.fullname, term)}`
            );

            const groupName = groupNameById.get(user.main_groupid) ?? 'Unknown';
            const tdEmailGroup = new Td2({value: ''});
            tdEmailGroup.appendTo(trbody);
            tdEmailGroup.getElement().html(`${highlight(user.email, term)}<br>`);
            const groupBadge = new Badge2({type: BadgeType2.info});
            groupBadge.getElement().html(`<b>${escapeHtml(groupName)}</b>`);
            groupBadge.appendTo(tdEmailGroup);

            const tdAdmin = new Td2({value: ''});
            tdAdmin.appendTo(trbody);
            if (user.isAdmin) {
                new Badge2({text: lang.l('admin') ?? 'admin', type: BadgeType2.warning}).appendTo(tdAdmin);
            } else {
                tdAdmin.getElement().html('<span class="text-muted">—</span>');
            }

            const tdDisable = new Td2({value: ''});
            tdDisable.appendTo(trbody);
            if (user.disable) {
                new Badge2({text: lang.l('disabled') ?? 'disabled', type: BadgeType2.danger}).appendTo(tdDisable);
            } else {
                new Badge2({text: lang.l('active') ?? 'active', type: BadgeType2.success}).appendTo(tdDisable);
            }

            const actionTd = new Td2({value: ''});
            actionTd.appendTo(trbody);
            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actionTd);

            btnMenu.addMenuItem('Edit', async(): Promise<void> => {
                const groups = await GroupAPI.getGroupList();

                this._usersDialog.resetValues();
                this._usersDialog.setTitle(new LangTextV2({text: 'Edit User'}));
                this._usersDialog.setUserId(user.id);
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

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const order = sort[activeKey];
                const dir = order === SortOrder2.DESC ? -1 : 1;
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

                    if (av < bv) {return -1 * dir;}
                    if (av > bv) {return Number(dir);}
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