import {
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    IconFa,
    LangTextV2,
    Table2,
    Td2,
    Th2,
    Tr2
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

        this._groupModal = new GroupEditModal();

        // save --------------------------------------------------------------------------------------------------------

        this._groupModal.setOnSave(async(): Promise<void> => {
            const editingId = this._groupModal.getGroupId();
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
                        title: Lang.i().l('Group save success.')
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
        this.addNavbarButton('Add Group', 'fas fa-plus', async() => {
            this._groupModal.resetValues();
            this._groupModal.setTitle(Lang.i().l('Add new Group'));

            const [orgs, roles] = await Promise.all([
                OrganizationAPI.getOrganizations(),
                AclAPI.getRoles()
            ]);

            if (orgs !== null) {
                this._groupModal.setOrganizations(orgs);
            }

            this._groupModal.setAclRolesCatalog(roles);
            this._groupModal.show();
        });

        this._onLoadTable = async(): Promise<void> => {
            const content = this._wrapper.getContentWrapper().getContent();
            content.empty();

            const row1 = new ContentRow2(content.getContentFluidElement());
            const card = new Card2({});
            card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());

            card.setTitle(new LangTextV2({text: 'Groups'}));
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

            const table = new Table2({});
            table.appendTo(card.getElement());

            const trhead = new Tr2();
            trhead.appendTo(table.getThead());

            new Th2({value: new LangTextV2({text: 'Id'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Name'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Role'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Organization'})}).appendTo(trhead);
            new Th2({value: ''}).appendTo(trhead);

            if (groups && groups.list) {
                for (const group of groups.list) {
                    const trbody = new Tr2();
                    trbody.appendTo(table.getTbody());

                    new Td2({value: `#${group.id}`}).appendTo(trbody);
                    new Td2({value: `${group.description}`}).appendTo(trbody);
                    new Td2({value: `${group.role}`}).appendTo(trbody);

                    const org = orgList.get(group.organization_id);

                    if (org) {
                        new Td2({value: `${org.name}`}).appendTo(trbody);
                    } else {
                        new Td2({value: 'not set'}).appendTo(trbody);
                    }

                    // action
                    const actionTd = new Td2({value: ''});
                    actionTd.appendTo(trbody);

                    const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
                    btnMenu.appendTo(actionTd);

                    btnMenu.addMenuItem(
                        'Edit',
                        async(): Promise<void> => {
                            this._groupModal.resetValues();
                            this._groupModal.setTitle(Lang.i().l('Edit Group'));
                            this._groupModal.setGroupId(group.id);
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