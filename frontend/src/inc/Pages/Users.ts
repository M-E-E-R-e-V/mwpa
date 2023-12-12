import {
    Badge, BadgeType,
    ButtonMenu, ButtonType,
    Card,
    ColumnContent,
    ContentCol,
    ContentColSize,
    ContentRow, IconFa,
    LangText,
    LeftNavbarLink, Switch,
    Table, Td,
    Th,
    Tr
} from 'bambooo';
import {Group as GroupAPI} from '../Api/Group';
import {User as UserAPI, UserData, UserListFilter} from '../Api/User';
import {Lang} from '../Lang';
import {UtilAvatarGenerator} from '../Utils/UtilAvatarGenerator';
import {UtilColor} from '../Utils/UtilColor';
import {UtilShorname} from '../Utils/UtilShorname';
import {BasePage} from './BasePage';
import {UsersEditModal} from './Users/UsersEditModal';

/**
 * Users
 */
export class Users extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'admin-users';

    /**
     * users dialog
     * @protected
     */
    protected _usersDialog: UsersEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // dialogs modal -----------------------------------------------------------------------------------------------

        this._usersDialog = new UsersEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', async() => {
            const groups = await GroupAPI.getGroupList();

            this._usersDialog.resetValues();
            this._usersDialog.setTitle('Add User');

            if (groups.list) {
                this._usersDialog.setMainGroupList(groups.list);
            }

            this._usersDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // users dialog save -------------------------------------------------------------------------------------------

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

                    this._toast.fire({
                        icon: 'success',
                        title: 'User save success.'
                    });
                }
            } catch ({message}) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const filter: UserListFilter = {
            filter: {
                show_disabled: false
            }
        };

        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol(row1, ContentColSize.col12));

            card.setTitle(new LangText('Users'));
            card.showLoading();

            const users = await UserAPI.getUserList(filter);
            const groups = await GroupAPI.getGroupList();

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, new ColumnContent([
                new LangText('Id'),
                new LangText('Avatar')
            ]));

            // eslint-disable-next-line no-new
            new Th(trhead, new ColumnContent([
                new LangText('Username'),
                new LangText('Fullname')
            ]));

            // eslint-disable-next-line no-new
            new Th(trhead, new ColumnContent([
                new LangText('EMail'),
                new LangText('Main-Group')
            ]));

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            // eslint-disable-next-line no-new
            const thDisabled = new Th(trhead, new LangText('Disabled'));
            const filterDisabled = new Switch(thDisabled, 'filterDisabled', 'Show all');
            filterDisabled.setEnable(filter.filter.show_disabled);
            filterDisabled.getElement().css({
                'margin-bottom': '0'
            });

            filterDisabled.setChangeFn((value) => {
                filter.filter.show_disabled = value;
                this._onLoadTable();
            });

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            if (users) {
                for (const user of users) {
                    const trbody = new Tr(table.getTbody());

                    const avatarImg = UtilAvatarGenerator.generateAvatar(
                        UtilShorname.getShortname(user.fullname),
                        'white',
                        UtilColor.getColor(user.username)
                    );

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${user.id}<br><div class="image"><img src="${avatarImg}" class="img-circle elevation-2" alt="User Image" width="33px"></div>`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, new ColumnContent([
                        `${user.username}`,
                        `${user.fullname}`
                    ]));

                    const tdemailGroup = new Td(trbody, `${user.email}<br>`);

                    let groupName = 'Unknown';

                    if (groups.list) {
                        for (const agroup of groups.list) {
                            if (agroup.id === user.main_groupid) {
                                groupName = agroup.description;
                            }
                        }
                    }

                    // eslint-disable-next-line no-new
                    new Badge(tdemailGroup, `<b>${groupName}</b>`, BadgeType.info);

                    // eslint-disable-next-line no-new
                    new Td(trbody, '');

                    // eslint-disable-next-line no-new
                    const tdDisable = new Td(trbody, '');

                    if (user.disable) {
                        // eslint-disable-next-line no-new
                        new Badge(tdDisable, 'Yes', BadgeType.danger);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(tdDisable, 'No', BadgeType.success);
                    }

                    // action
                    const actionTd = new Td(trbody, '');

                    const btnMenu = new ButtonMenu(
                        actionTd,
                        IconFa.bars,
                        true,
                        ButtonType.borderless
                    );

                    btnMenu.addMenuItem(
                        'Edit',
                        (): void => {
                            this._usersDialog.resetValues();
                            this._usersDialog.setTitle('Edit User');
                            this._usersDialog.setId(user.id);
                            this._usersDialog.setUsername(user.username);
                            this._usersDialog.setFullname(user.fullname);
                            this._usersDialog.setEMail(user.email);

                            if (groups.list) {
                                this._usersDialog.setMainGroupList(groups.list);
                            }

                            this._usersDialog.setMainGroup(user.main_groupid);
                            this._usersDialog.setIsAdmin(user.isAdmin);
                            this._usersDialog.setIsDisabled(user.disable);

                            this._usersDialog.show();
                        },
                        IconFa.edit
                    );
                }
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}