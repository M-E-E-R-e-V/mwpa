import {
    ButtonMenu, ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow, IconFa,
    LangText,
    LeftNavbarLink,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {Group as GroupAPI} from '../Api/Group';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

/**
 * Group
 */
export class Group extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'admin-user-groups';

    /**
     * constructor
     */
    public constructor() {
        super();

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Group', async() => {
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
            const card = new Card(new ContentCol(row1, ContentColSize.col12));

            card.setTitle(new LangText('Groups'));
            card.showLoading();

            const groups = await GroupAPI.getGroupList();

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Id'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Name'));

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            if (groups) {
                for (const group of groups) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${group.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${group.description}`);

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
                            // TODO
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