import {
    FormGroup,
    InputBottemBorderOnly2,
    LangText,
    ModalDialog,
    ModalDialogType,
    SelectBottemBorderOnly2
} from 'bambooo';
import {GroupRoles} from '../../Api/Group';
import {OrganizationFullEntry} from '../../Api/Organization';

/**
 * Group edit modal
 */
export class GroupEditModal extends ModalDialog {

    /**
     * ID from group
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: InputBottemBorderOnly2;

    /**
     * Role select
     * @protected
     */
    protected _selectRole: SelectBottemBorderOnly2;

    /**
     * Organization select
     * @protected
     */
    protected _selectOrganization: SelectBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'groupmodal', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Name');
        this._inputName = new InputBottemBorderOnly2(groupName);

        const groupRole = new FormGroup(bodyCard, 'Role');
        this._selectRole = new SelectBottemBorderOnly2(groupRole);

        for (const role of Object.values(GroupRoles)) {
            this._selectRole.addValue({
                key: `${role}`,
                value: `${role}`
            });
        }

        const groupOrg = new FormGroup(bodyCard, 'Organization');
        this._selectOrganization = new SelectBottemBorderOnly2(groupOrg);

        this._selectOrganization.addValue({
            key: '0',
            value: 'None set'
        });

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * Set id from group
     * @param {number} id
     */
    public setId(id: number): void {
        this._id = id;
    }

    /**
     * Return id from group
     * @returns {number|null}
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * Set the group name
     * @param {string} name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Return the group name
     * @returns {string}
     */
    public getName(): string {
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
            value: 'None set'
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

}