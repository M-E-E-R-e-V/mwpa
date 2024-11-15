import {FormGroup, FormRow, InputBottemBorderOnly2, LangText, ModalDialog, ModalDialogType} from 'bambooo';


export class OrganizationEditModal extends ModalDialog {

    /**
     * ID from organization
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: InputBottemBorderOnly2;

    /**
     * input country
     * @protected
     */
    protected _inputCountry: InputBottemBorderOnly2;

    /**
     * input location
     * @protected
     */
    protected _inputLocation: InputBottemBorderOnly2;

    /**
     * input lon
     * @protected
     */
    protected _inputLon: InputBottemBorderOnly2;

    /**
     * input lat
     * @protected
     */
    protected _inputLat: InputBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'organizationmodal', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Name');
        this._inputName = new InputBottemBorderOnly2(groupName, 'orgname');

        const groupCountry = new FormGroup(bodyCard, 'Country');
        this._inputCountry = new InputBottemBorderOnly2(groupCountry, 'country');

        const groupLocation = new FormGroup(bodyCard, 'Location');
        this._inputLocation = new InputBottemBorderOnly2(groupLocation, 'location');

        const rowPosition = new FormRow(bodyCard);
        const groupLon = new FormGroup(rowPosition.createCol(6), 'Lon');
        this._inputLon = new InputBottemBorderOnly2(groupLon, 'lon');

        const groupLat = new FormGroup(rowPosition.createCol(6), 'Lat');
        this._inputLat = new InputBottemBorderOnly2(groupLat, 'lat');

        // buttons -----------------------------------------------------------------------------------------------------

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * Set id from organization
     * @param {number} id
     */
    public setId(id: number): void {
        this._id = id;
    }

    /**
     * Return id from organization
     * @returns {number|null}
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * Set the organization name
     * @param {string} name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Return the organization name
     * @returns {string}
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * Set the country for organization
     * @param {string} country
     */
    public setCountry(country: string): void {
        this._inputCountry.setValue(country);
    }

    /**
     * Return the country for organization
     * @returns {string}
     */
    public getCountry(): string {
        return this._inputCountry.getValue();
    }

    /**
     * Set the location for organization
     * @param {string} location
     */
    public setLocation(location: string): void {
        this._inputLocation.setValue(location);
    }

    /**
     * Return the location from organization
     * @returns {string}
     */
    public getLocation(): string {
        return this._inputLocation.getValue();
    }

    /**
     * Set the Lon for organization
     * @param {string} lon
     */
    public setLon(lon: string): void {
        this._inputLon.setValue(lon);
    }

    /**
     * Return the lon from organization
     */
    public getLon(): string {
        return this._inputLon.getValue();
    }

    /**
     * Set the lat for organization
     * @param {string} lat
     */
    public setLat(lat: string): void {
        this._inputLat.setValue(lat);
    }

    /**
     * Return the lat from organization
     * @returns {string}
     */
    public getLat(): string {
        return this._inputLat.getValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this._id = null;
        this.setName('');
        this.setCountry('');
        this.setLocation('');
        this.setLon('');
        this.setLat('');
    }

}