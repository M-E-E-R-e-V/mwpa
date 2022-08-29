import {Group as GroupAPI} from '../Api/Group';
import {User as UserAPI, UserData} from '../Api/User';
import {ColumnContent} from '../Bambooo/ColumnContent';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LangText} from '../Bambooo/Lang/LangText';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Lang} from '../Lang';
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

            if (groups) {
                this._usersDialog.setMainGroupList(groups);
            }

            this._usersDialog.show();
            return false;
        });

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
                    full_name: this._usersDialog.getFullname(),
                    email: this._usersDialog.getEMail(),
                    password: this._usersDialog.getPassword(),
                    main_groupid: this._usersDialog.getMainGroup(),
                    isAdmin: this._usersDialog.getIsAdmin(),
                    disable: this._usersDialog.getIsDisabled()
                };

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
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol12(row1));

            card.setTitle(new LangText('Users'));
            card.showLoading();

            const users = await UserAPI.getUserList();
            const groups = await GroupAPI.getGroupList();

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Id'));

            // eslint-disable-next-line no-new
            new Th(trhead, new ColumnContent([
                new LangText('Username'),
                new LangText('Fullname')
            ]));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('EMail'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Main-Group'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Disabled'));

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            if (users) {
                for (const user of users) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${user.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, new ColumnContent([
                        `${user.username}`,
                        `${user.full_name}`
                    ]));

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${user.email}`);

                    let groupName = 'Unknow';

                    if (groups) {
                        for (const agroup of groups) {
                            if (agroup.id == user.main_groupid) {
                                groupName = agroup.description;
                            }
                        }
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${groupName}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, new LangText(user.disable ? 'Yes' : 'No'));

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
                            this._usersDialog.setFullname(user.full_name);
                            this._usersDialog.setEMail(user.email);

                            if (groups) {
                                this._usersDialog.setMainGroupList(groups);
                            }

                            this._usersDialog.setMainGroup(user.main_groupid);
                            this._usersDialog.setIsAdmin(user.isAdmin);
                            this._usersDialog.setIsDisabled(user.disable);

                            this._usersDialog.show();
                        },
                        IconFa.edit);
                }
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}