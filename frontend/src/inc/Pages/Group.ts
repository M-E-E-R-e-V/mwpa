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
import {Acl as AclAPI} from '../Api/Acl';
import {Group as GroupAPI, GroupEntry, GroupOrganization} from '../Api/Group';
import {Organization as OrganizationAPI} from '../Api/Organization';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {GroupEditModal} from './Group/GroupEditModal';

/**
 * Group
 */
export class Group extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'admin-user-groups';

    /**
     * Group Modal
     * @protected
     */
    protected _groupModal: GroupEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this._groupModal = new GroupEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Group', async() => {
            this._groupModal.resetValues();
            this._groupModal.setTitle('Add new Group');

            const [orgs, roles] = await Promise.all([
                OrganizationAPI.getOrganizations(),
                AclAPI.getRoles()
            ]);

            if (orgs !== null) {
                this._groupModal.setOrganizations(orgs);
            }

            this._groupModal.setAclRolesCatalog(roles);
            this._groupModal.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // save --------------------------------------------------------------------------------------------------------

        this._groupModal.setOnSave(async(): Promise<void> => {
            const editingId = this._groupModal.getId();
            const tid = editingId ?? 0;

            try {
                const groupEntry: GroupEntry = {
                    id: tid,
                    description: this._groupModal.getName(),
                    role: this._groupModal.getRole(),
                    organization_id: this._groupModal.getOrganization()
                };

                if (await GroupAPI.saveGroup(groupEntry)) {
                    /*
                     * Access roles are persisted in a separate join table.
                     * We can only update them on existing groups — `saveGroup`
                     * doesn't return the new id, so on add the user must re-open
                     * the modal once the group exists.
                     */
                    if (editingId !== null) {
                        await AclAPI.saveGroupRoles(editingId, this._groupModal.getAclRoles());
                    }

                    this._groupModal.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Group save success.'
                    });
                }
            } catch (message) {
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
    public override async loadContent(): Promise<void> {
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol(row1, ContentColSize.col12));

            card.setTitle(new LangText('Groups'));
            card.showLoading();

            const groups = await GroupAPI.getGroupList();

            const orgList = new Map<number, GroupOrganization>();

            if (groups) {
                if (groups.organizationList) {
                    for (const org of groups.organizationList) {
                        orgList.set(org.id, org);
                    }
                }
            }

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Id'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Name'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Role'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Organization'));

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            if (groups && groups.list) {
                for (const group of groups.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${group.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${group.description}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${group.role}`);

                    const org = orgList.get(group.organization_id);

                    if (org) {
                        // eslint-disable-next-line no-new
                        new Td(trbody, `${org.name}`);
                    } else {
                        // eslint-disable-next-line no-new
                        new Td(trbody, 'not set');
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
                        async(): Promise<void> => {
                            this._groupModal.resetValues();
                            this._groupModal.setTitle('Edit Group');
                            this._groupModal.setId(group.id);
                            this._groupModal.setName(group.description);
                            this._groupModal.setRole(group.role);

                            const [orgs, roles, groupsRoles] = await Promise.all([
                                OrganizationAPI.getOrganizations(),
                                AclAPI.getRoles(),
                                AclAPI.getGroupsRoles()
                            ]);

                            if (orgs !== null) {
                                this._groupModal.setOrganizations(orgs);
                            }

                            this._groupModal.setOrganization(group.organization_id);
                            this._groupModal.setAclRolesCatalog(roles);

                            const assigned = groupsRoles.find((g) => g.group_id === group.id);
                            this._groupModal.setAclRoles(assigned?.role_ids ?? []);

                            this._groupModal.show();
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