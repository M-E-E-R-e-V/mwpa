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
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {RoleEditModal} from './Roles/RoleEditModal';
import {RoleRightsEditModal} from './Roles/RoleRightsEditModal';

/**
 * Roles admin page (bambooo v2). Lists roles with rename (RoleEditModal),
 * rights (RoleRightsEditModal) and delete actions. New roles via the "Add role"
 * navbar link. The seeded system roles (root, user) can't be renamed/deleted.
 */
export class Roles extends BasePage {

    protected override _name: string = 'admin-roles';

    /**
     * Open the create/rename dialog, wired to save.
     * @param {string} title
     * @return {RoleEditModal}
     * @protected
     */
    protected _openRoleDialog(title: string): RoleEditModal {
        const dialog = new RoleEditModal();
        dialog.setTitle(title);

        dialog.setOnSave(async(): Promise<void> => {
            try {
                if (await AclAPI.saveRoleName(dialog.getRoleId(), dialog.getName())) {
                    dialog.hide();
                    dialog.destroy();
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }
                    this._toast.fire({icon: 'success', title: 'Role saved.'});
                } else {
                    this._toast.fire({icon: 'error', title: 'Role save failed.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        return dialog;
    }

    /**
     * Open the rights dialog for a role, wired to save.
     * @param {string} roleName
     * @return {RoleRightsEditModal}
     * @protected
     */
    protected _openRoleRightsDialog(roleName: string): RoleRightsEditModal {
        const dialog = new RoleRightsEditModal();
        dialog.setTitle(`Rights for role: ${roleName}`);

        dialog.setOnSave(async(): Promise<void> => {
            try {
                if (await AclAPI.saveRoleRights(dialog.getRoleId(), dialog.getRoleRights())) {
                    dialog.hide();
                    dialog.destroy();
                    this._toast.fire({icon: 'success', title: 'Rights saved.'});
                } else {
                    this._toast.fire({icon: 'error', title: 'Rights save failed.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        return dialog;
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add role', 'fas fa-plus', async(): Promise<void> => {
            this._openRoleDialog('Add new role').show();
        });

        const content = this._wrapper.getContentWrapper().getContent();

        this._onLoadTable = async(): Promise<void> => {
            content.empty();

            const row = new ContentRow2(content.getContentFluidElement());
            const card = new Card2({});
            card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
            card.setTitle(new LangTextV2({text: 'Roles'}));
            card.showLoading();

            const table = new Table2({striped: true});
            table.appendTo(card.getElement());

            const trhead = new Tr2();
            trhead.appendTo(table.getThead());
            new Th2({value: new LangTextV2({text: 'Name'})}).appendTo(trhead);
            new Th2({value: '', width: '120px'}).appendTo(trhead);

            const roles = await AclAPI.getRoles();

            for (const role of roles) {
                const trbody = new Tr2();
                trbody.appendTo(table.getTbody());

                new Td2({
                    value: `<i class="fas fa-user-tag mr-2 text-muted"></i><b>${role.name}</b>`
                }).appendTo(trbody);

                const actionTd = new Td2({value: ''});
                actionTd.appendTo(trbody);

                const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
                btnMenu.appendTo(actionTd);

                btnMenu.addMenuItem('Edit', (): void => {
                    const dialog = this._openRoleDialog(`Edit role: ${role.name}`);
                    dialog.setRoleId(role.id);
                    dialog.setName(role.name);
                    dialog.show();
                }, IconFa.edit);

                btnMenu.addMenuItem('Set rights', async(): Promise<void> => {
                    const dialog = this._openRoleRightsDialog(role.name);
                    dialog.setRoleId(role.id);

                    const [allRights, roleRights] = await Promise.all([
                        AclAPI.getRights(),
                        AclAPI.getRoleRights(role.id)
                    ]);

                    dialog.setRights(allRights);
                    dialog.setRoleRights(roleRights);
                    dialog.show();
                }, IconFa.lock);

                // System roles (root, user) are seeded from code and must stay.
                if (role.name !== 'root' && role.name !== 'user') {
                    btnMenu.addMenuItem('Delete', async(): Promise<void> => {
                        // eslint-disable-next-line no-alert
                        if (!window.confirm(`Delete role "${role.name}"? Its rights and group assignments are removed.`)) {
                            return;
                        }
                        try {
                            if (await AclAPI.deleteRole(role.id)) {
                                this._toast.fire({icon: 'success', title: 'Role deleted.'});
                                if (this._onLoadTable) {
                                    await this._onLoadTable();
                                }
                            } else {
                                this._toast.fire({icon: 'error', title: 'Role delete failed.'});
                            }
                        } catch (message) {
                            this._toast.fire({icon: 'error', title: message});
                        }
                    }, IconFa.trash);
                }
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        await this._onLoadTable();
    }

}