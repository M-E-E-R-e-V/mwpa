import {User as UserAPI} from '../Api/User';
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
     * constructor
     */
    public constructor() {
        super();

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', () => {
            return false;
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

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${user.main_groupid}`);

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