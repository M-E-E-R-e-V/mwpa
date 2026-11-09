/* global JQuery */
import {Lang} from '../../Lang';
import {
    FormRow2,
    Input2,
    ModalDialog2,
    ModalDialogType2,
    Select2
} from 'bambooo';
import {OrganizationFullEntry} from '../../Api/Organization';
import {FormLayout} from '../../Widget/FormLayout';

/**
 * VehicleEditModal
 *
 * Admin dialog to create or edit a vehicle (v2, {@link FormLayout}): name
 * and organization, plus two independent status switches:
 *
 *   - **In use** — drives whether the vehicle shows up in operational pickers
 *     (sighting create dialog, sighting filter, tour creation). Toggle off to
 *     retire an active boat without losing it from historical data.
 *   - **Deleted** — soft-delete marker. Hides the vehicle from the admin list
 *     (unless "show deleted"); historical sightings keep their reference.
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
    protected _switchInUse: JQuery<HTMLInputElement>;

    /**
     * Switch "is deleted" (soft delete)
     * @protected
     */
    protected _switchIsDeleted: JQuery<HTMLInputElement>;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        // general -----------------------------------------------------------------------------------------------------

        const general = FormLayout.section(body, 'fas fa-ship', 'General');
        const rowGeneral = new FormRow2({});
        rowGeneral.appendTo(general);

        this._inputName = FormLayout.input(rowGeneral.createCol(6), 'Vehicle Name', {
            icon: 'fas fa-ship',
            placeholder: 'Name of vehicle',
            required: true
        });

        this._selectOrganization = FormLayout.select(rowGeneral.createCol(6), 'Organization', {
            icon: 'fas fa-building',
            required: true
        });

        // status ------------------------------------------------------------------------------------------------------

        const status = FormLayout.section(body, 'fas fa-toggle-on', 'Status');

        this._switchInUse = FormLayout.switch(
            status,
            'In use',
            'Shown in the operational pickers (new sightings, sighting filter, tours). Switch off to retire a boat — its sightings stay unchanged.'
        );

        this._switchIsDeleted = FormLayout.switch(
            status,
            'Deleted',
            'Hidden from the vehicle list and all pickers. Historical sightings keep their reference; can be restored at any time.'
        );

        // a deleted vehicle is never in use
        this._switchIsDeleted.on('change', (): void => this._syncSwitches());

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * Deleted → in use is off and locked.
     * @protected
     */
    protected _syncSwitches(): void {
        const deleted = this.getIsDeleted();

        if (deleted) {
            this._switchInUse.prop('checked', false);
        }

        this._switchInUse.prop('disabled', deleted);
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

        this._selectOrganization.addValue({
            key: '0',
            value: Lang.i().l('Please select …')
        });

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
        this._switchInUse.prop('checked', inUse);
        this._syncSwitches();
    }

    /**
     * Return the "in use" flag
     * @returns {boolean}
     */
    public getInUse(): boolean {
        return this._switchInUse.prop('checked') === true && !this.getIsDeleted();
    }

    /**
     * Set the "is deleted" flag
     * @param {boolean} deleted
     */
    public setIsDeleted(deleted: boolean): void {
        this._switchIsDeleted.prop('checked', deleted);
        this._syncSwitches();
    }

    /**
     * Return the "is deleted" flag
     * @returns {boolean}
     */
    public getIsDeleted(): boolean {
        return this._switchIsDeleted.prop('checked') === true;
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setVehicleId(null);
        this.setName('');
        this.setOrganization(0);
        this.setIsDeleted(false);
        this.setInUse(true);
    }

}