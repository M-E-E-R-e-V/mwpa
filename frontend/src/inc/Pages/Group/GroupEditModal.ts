import {Lang} from '../../Lang';
import {
    FormGroup2,
    Input2,
    ModalDialog2,
    ModalDialogType2,
    Multiple2,
    Select2
} from 'bambooo';
import {RoleEntry} from '../../Api/Acl';
import {GroupRoles} from '../../Api/Group';
import {OrganizationFullEntry} from '../../Api/Organization';

/**
 * Group edit modal
 */
export class GroupEditModal extends ModalDialog2 {

    /**
     * ID from group
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: Input2;

    /**
     * Role select
     * @protected
     */
    protected _selectRole: Select2;

    /**
     * Organization select
     * @protected
     */
    protected _selectOrganization: Select2;

    /**
     * Multi-select for RBAC roles (groups_roles).
     * @protected
     */
    protected _selectAclRoles: Multiple2;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupName = new FormGroup2({label: Lang.i().l('Name')});
        groupName.appendTo(bodyCard);
        this._inputName = new Input2({});
        this._inputName.appendTo(groupName);

        const groupRole = new FormGroup2({label: Lang.i().l('Role')});
        groupRole.appendTo(bodyCard);
        this._selectRole = new Select2({});
        this._selectRole.appendTo(groupRole);

        for (const role of Object.values(GroupRoles)) {
            this._selectRole.addValue({
                key: `${role}`,
                value: `${role}`
            });
        }

        const groupOrg = new FormGroup2({label: Lang.i().l('Organization')});
        groupOrg.appendTo(bodyCard);
        this._selectOrganization = new Select2({});
        this._selectOrganization.appendTo(groupOrg);

        this._selectOrganization.addValue({
            key: '0',
            value: Lang.i().l('None set')
        });

        const groupAclRoles = new FormGroup2({label: Lang.i().l('Access roles')});
        groupAclRoles.appendTo(bodyCard);
        this._selectAclRoles = new Multiple2({});
        this._selectAclRoles.appendTo(groupAclRoles);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * Set id from group
     * @param {number} id
     */
    public setGroupId(id: number): void {
        this._id = id;
    }

    /**
     * Return id from group
     * @returns {number|null}
     */
    public getGroupId(): number|null {
        return this._id;
    }

    /**
     * Set the group name
     * @param {string} name
     */
    public override setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Return the group name
     * @returns {string}
     */
    public override getName(): string {
        return this._inputName.getValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this._id = null;
        this.setName('');
        this.setRole(GroupRoles.guide);
        this._selectOrganization.clearValues();
        this.setOrganization(0);
        this._selectAclRoles.clearValues();
    }

    /**
     * Set role
     * @param {string} role
     */
    public setRole(role: string): void {
        this._selectRole.setSelectedValue(role);
    }

    /**
     * Get the role
     */
    public getRole(): string {
        return this._selectRole.getSelectedValue();
    }

    /**
     * Set the Organizations
     * @param {OrganizationFullEntry[]} orgs
     */
    public setOrganizations(orgs: OrganizationFullEntry[]): void {
        this._selectOrganization.addValue({
            key: '0',
            value: Lang.i().l('None set')
        });

        for (const org of orgs) {
            this._selectOrganization.addValue({
                key: `${org.id}`,
                value: org.description
            });
        }
    }

    /**
     * Set the organization
     * @param {number} orgId
     */
    public setOrganization(orgId: number): void {
        this._selectOrganization.setSelectedValue(`${orgId}`);
    }

    /**
     * Return the organization
     * @returns {number}
     */
    public getOrganization(): number {
        return parseInt(this._selectOrganization.getSelectedValue(), 10) || 0;
    }

    /**
     * Populate the access-roles multi-select with the catalog of available roles.
     * @param {RoleEntry[]} roles
     */
    public setAclRolesCatalog(roles: RoleEntry[]): void {
        this._selectAclRoles.clearValues();
        for (const role of roles) {
            this._selectAclRoles.addValue({key: `${role.id}`, value: role.name});
        }
    }

    /**
     * Set which RBAC roles the group is currently assigned.
     * @param {number[]} roleIds
     */
    public setAclRoles(roleIds: number[]): void {
        this._selectAclRoles.setValue(roleIds.map((id) => `${id}`));
    }

    /**
     * Return the selected RBAC role ids.
     * @returns {number[]}
     */
    public getAclRoles(): number[] {
        return this._selectAclRoles.getValue()
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
    }

}