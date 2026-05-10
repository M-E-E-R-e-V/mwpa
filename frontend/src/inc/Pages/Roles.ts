import {
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    LangText,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {Acl as AclAPI} from '../Api/Acl';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {RoleEditModal} from './Roles/RoleEditModal';
import {RoleRightsEditModal} from './Roles/RoleRightsEditModal';

/**
 * Roles admin page. Lists every role from the seeded catalog with two actions:
 * rename (RoleEditModal) and assign rights (RoleRightsEditModal). Roles can't
 * be created/deleted — that's controlled by ACLRbac.ROLES in code.
 */
export class Roles extends BasePage {

    protected override _name: string = 'admin-roles';

    protected _editModal: RoleEditModal;

    protected _rightsModal: RoleRightsEditModal;

    public constructor() {
        super();

        this._editModal = new RoleEditModal(this._wrapper.getContentWrapper().getContent().getElement());
        this._rightsModal = new RoleRightsEditModal(this._wrapper.getContentWrapper().getContent().getElement());

        this._editModal.setOnSave(async(): Promise<void> => {
            try {
                const ok = await AclAPI.saveRoleName(this._editModal.getId(), this._editModal.getName());
                if (ok) {
                    this._editModal.hide();
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

        this._rightsModal.setOnSave(async(): Promise<void> => {
            try {
                const ok = await AclAPI.saveRoleRights(
                    this._rightsModal.getRoleId(),
                    this._rightsModal.getRoleRights()
                );
                if (ok) {
                    this._rightsModal.hide();
                    this._toast.fire({icon: 'success', title: 'Rights saved.'});
                } else {
                    this._toast.fire({icon: 'error', title: 'Rights save failed.'});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    public override async loadContent(): Promise<void> {
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol(row, ContentColSize.col12));
            card.setTitle(new LangText('Roles'));
            card.showLoading();

            const table = new Table(card.getElement(), {striped: true});
            const trhead = new Tr(table.getThead());
            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Name'));
            // eslint-disable-next-line no-new
            new Th(trhead, '120px');

            const roles = await AclAPI.getRoles();

            for (const role of roles) {
                const trbody = new Tr(table.getTbody());
                // eslint-disable-next-line no-new
                new Td(trbody, `<i class="fas fa-user-tag mr-2 text-muted"></i><b>${role.name}</b>`);

                const actionTd = new Td(trbody, '');
                const btnMenu = new ButtonMenu(actionTd, IconFa.bars, true, ButtonType.borderless);

                btnMenu.addMenuItem('Edit', () => {
                    this._editModal.resetValues();
                    this._editModal.setTitle(`Edit role: ${role.name}`);
                    this._editModal.setId(role.id);
                    this._editModal.setName(role.name);
                    this._editModal.show();
                }, IconFa.edit);

                btnMenu.addMenuItem('Set rights', async(): Promise<void> => {
                    this._rightsModal.resetValues();
                    this._rightsModal.setTitle(`Rights for role: ${role.name}`);
                    this._rightsModal.setRoleId(role.id);

                    const [allRights, roleRights] = await Promise.all([
                        AclAPI.getRights(),
                        AclAPI.getRoleRights(role.id)
                    ]);

                    this._rightsModal.setRights(allRights);
                    this._rightsModal.setRoleRights(roleRights);
                    this._rightsModal.show();
                }, 'fa fa-lock');
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        await this._onLoadTable();
    }

}