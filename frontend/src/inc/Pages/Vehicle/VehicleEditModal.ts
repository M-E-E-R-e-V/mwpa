import {Lang} from '../../Lang';
import {
    FormGroup2,
    Input2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2,
    Select2,
    Switch2
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
export class VehicleEditModal extends ModalDialog2 {

    /**
     * id of entry (null for create)
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: Input2;

    /**
     * Select organization
     * @protected
     */
    protected _selectOrganization: Select2;

    /**
     * Switch "in use"
     * @protected
     */
    protected _switchInUse: Switch2;

    /**
     * Switch "is deleted" (soft delete)
     * @protected
     */
    protected _switchIsDeleted: Switch2;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupName = new FormGroup2({label: new LangTextV2({text: 'Vehicle Name'})});
        groupName.appendTo(bodyCard);
        this._inputName = new Input2({});
        this._inputName.appendTo(groupName);
        this._inputName.setPlaceholder(Lang.i().l('Name of vehicle'));

        const groupOrganization = new FormGroup2({label: new LangTextV2({text: 'Organization'})});
        groupOrganization.appendTo(bodyCard);
        this._selectOrganization = new Select2({});
        this._selectOrganization.appendTo(groupOrganization);

        const groupInUse = new FormGroup2({
            label: new LangTextV2({text: 'In use (shown in operational pickers)'})
        });
        groupInUse.appendTo(bodyCard);
        this._switchInUse = new Switch2({});
        this._switchInUse.appendTo(groupInUse);

        const groupIsDeleted = new FormGroup2({
            label: new LangTextV2({text: 'Deleted (hidden from admin list)'})
        });
        groupIsDeleted.appendTo(bodyCard);
        this._switchIsDeleted = new Switch2({});
        this._switchIsDeleted.appendTo(groupIsDeleted);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * getVehicleId
     */
    public getVehicleId(): number|null {
        return this._id;
    }

    /**
     * setVehicleId
     * @param id
     */
    public setVehicleId(id: number|null): void {
        this._id = id;
    }

    /**
     * getName
     */
    public override getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public override setName(name: string): void {
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
        this.setVehicleId(null);
        this.setName('');
        this.setOrganization(0);
        this.setInUse(true);
        this.setIsDeleted(false);
    }

}