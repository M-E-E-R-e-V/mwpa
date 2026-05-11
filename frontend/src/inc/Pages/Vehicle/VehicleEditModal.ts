import {
    ComponentType,
    FormGroup,
    InputBottemBorderOnly2,
    LangText,
    ModalDialog,
    ModalDialogType,
    SelectBottemBorderOnly2,
    Switch
} from 'bambooo';
import {OrganizationFullEntry} from '../../Api/Organization';

/**
 * VehicleEditModal
 *
 * Admin dialog to create or edit a vehicle. Two independent switches:
 *
 *   - **In use** — drives whether the vehicle shows up in operational pickers
 *     (sighting create dialog, sighting filter, tour creation). Toggle off to
 *     retire an active boat without losing it from historical data.
 *   - **Deleted** — soft-delete marker. Set true to hide the vehicle from the
 *     admin list as well; historical sightings keep their reference.
 *
 * Both flags exist on the entity as separate columns by design — see
 * `Vehicle.in_use` / `Vehicle.isdeleted`.
 */
export class VehicleEditModal extends ModalDialog {

    /**
     * id of entry (null for create)
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: InputBottemBorderOnly2;

    /**
     * Select organization
     * @protected
     */
    protected _selectOrganization: SelectBottemBorderOnly2;

    /**
     * Switch "in use"
     * @protected
     */
    protected _switchInUse: Switch;

    /**
     * Switch "is deleted" (soft delete)
     * @protected
     */
    protected _switchIsDeleted: Switch;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: ComponentType) {
        super(elementObject, 'vehiclemodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, new LangText('Vehicle Name'));
        this._inputName = new InputBottemBorderOnly2(groupName);
        this._inputName.setPlaceholder('Name of vehicle');

        const groupOrganization = new FormGroup(bodyCard, new LangText('Organization'));
        this._selectOrganization = new SelectBottemBorderOnly2(groupOrganization);

        const groupInUse = new FormGroup(
            bodyCard,
            new LangText('In use (shown in operational pickers)')
        );
        this._switchInUse = new Switch(groupInUse, 'vehicleinuse');

        const groupIsDeleted = new FormGroup(
            bodyCard,
            new LangText('Deleted (hidden from admin list)')
        );
        this._switchIsDeleted = new Switch(groupIsDeleted, 'vehicleisdeleted');

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Set the organization list
     * @param {OrganizationFullEntry[]} orgs
     */
    public setOrganizationList(orgs: OrganizationFullEntry[]): void {
        this._selectOrganization.clearValues();

        for (const org of orgs) {
            this._selectOrganization.addValue({
                key: `${org.id}`,
                value: org.description
            });
        }
    }

    /**
     * Set the selected organization
     * @param {number} organizationId
     */
    public setOrganization(organizationId: number): void {
        this._selectOrganization.setSelectedValue(`${organizationId}`);
    }

    /**
     * Return the selected organization id
     * @returns {number}
     */
    public getOrganization(): number {
        return parseInt(this._selectOrganization.getSelectedValue(), 10) || 0;
    }

    /**
     * Set the "in use" flag
     * @param {boolean} inUse
     */
    public setInUse(inUse: boolean): void {
        this._switchInUse.setEnable(inUse);
    }

    /**
     * Return the "in use" flag
     * @returns {boolean}
     */
    public getInUse(): boolean {
        return this._switchInUse.isEnable();
    }

    /**
     * Set the "is deleted" flag
     * @param {boolean} deleted
     */
    public setIsDeleted(deleted: boolean): void {
        this._switchIsDeleted.setEnable(deleted);
    }

    /**
     * Return the "is deleted" flag
     * @returns {boolean}
     */
    public getIsDeleted(): boolean {
        return this._switchIsDeleted.isEnable();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setId(null);
        this.setName('');
        this.setOrganization(0);
        this.setInUse(true);
        this.setIsDeleted(false);
    }

}