import {
    ComponentType,
    FormGroup,
    FormRow,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType
} from 'bambooo';


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
     * input province
     * @protected
     */
    protected _inputProvince: InputBottemBorderOnly2;

    /**
     * input island
     * @protected
     */
    protected _inputIsland: InputBottemBorderOnly2;

    /**
     * input port
     * @protected
     */
    protected _inputPort: InputBottemBorderOnly2;

    /**
     * input email
     * @protected
     */
    protected _inputEmail: InputBottemBorderOnly2;

    /**
     * input web
     * @protected
     */
    protected _inputWeb: InputBottemBorderOnly2;

    /**
     * input AROC reference
     * @protected
     */
    protected _inputArocReference: InputBottemBorderOnly2;

    /**
     * input AROC region (CAN/RES/AND)
     * @protected
     */
    protected _inputArocRegion: InputBottemBorderOnly2;

    /**
     * input AROC number
     * @protected
     */
    protected _inputArocNumber: InputBottemBorderOnly2;

    /**
     * input AROC authorized boats
     * @protected
     */
    protected _inputArocAuthorizedBoats: InputBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: ComponentType) {
        super(elementObject, 'organizationmodal', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, new LangText('Name'));
        this._inputName = new InputBottemBorderOnly2(groupName, 'orgname');

        const groupCountry = new FormGroup(bodyCard, new LangText('Country'));
        this._inputCountry = new InputBottemBorderOnly2(groupCountry, 'country');

        const groupLocation = new FormGroup(bodyCard, new LangText('Location'));
        this._inputLocation = new InputBottemBorderOnly2(groupLocation, 'location');

        const rowPosition = new FormRow(bodyCard);
        const groupLon = new FormGroup(rowPosition.createCol(6), new LangText('Lon'));
        this._inputLon = new InputBottemBorderOnly2(groupLon, 'lon');

        const groupLat = new FormGroup(rowPosition.createCol(6), new LangText('Lat'));
        this._inputLat = new InputBottemBorderOnly2(groupLat, 'lat');

        // AROC office-report fields ---------------------------------------------------------------------------------

        jQuery('<hr/>').appendTo(bodyCard);
        jQuery('<h6 class="text-muted"></h6>').text('AROC').appendTo(bodyCard);

        const rowPlace = new FormRow(bodyCard);
        const groupProvince = new FormGroup(rowPlace.createCol(4), new LangText('Province'));
        this._inputProvince = new InputBottemBorderOnly2(groupProvince, 'province');

        const groupIsland = new FormGroup(rowPlace.createCol(4), new LangText('Island'));
        this._inputIsland = new InputBottemBorderOnly2(groupIsland, 'island');

        const groupPort = new FormGroup(rowPlace.createCol(4), new LangText('Port'));
        this._inputPort = new InputBottemBorderOnly2(groupPort, 'port');

        const rowContact = new FormRow(bodyCard);
        const groupEmail = new FormGroup(rowContact.createCol(6), new LangText('E-Mail'));
        this._inputEmail = new InputBottemBorderOnly2(groupEmail, 'email');

        const groupWeb = new FormGroup(rowContact.createCol(6), new LangText('Website'));
        this._inputWeb = new InputBottemBorderOnly2(groupWeb, 'web');

        const rowAroc1 = new FormRow(bodyCard);
        const groupArocRegion = new FormGroup(rowAroc1.createCol(4), new LangText('AROC region'));
        this._inputArocRegion = new InputBottemBorderOnly2(groupArocRegion, 'aroc_region');

        const groupArocNumber = new FormGroup(rowAroc1.createCol(4), new LangText('AROC number'));
        this._inputArocNumber = new InputBottemBorderOnly2(groupArocNumber, 'aroc_number');

        const groupArocBoats = new FormGroup(rowAroc1.createCol(4), new LangText('Authorized boats'));
        this._inputArocAuthorizedBoats = new InputBottemBorderOnly2(
            groupArocBoats,
            'aroc_authorized_boats',
            InputType.number
        );

        const groupArocReference = new FormGroup(bodyCard, new LangText('AROC reference'));
        this._inputArocReference = new InputBottemBorderOnly2(groupArocReference, 'aroc_reference');

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

    public setProvince(v: string): void {
        this._inputProvince.setValue(v);
    }

    public getProvince(): string {
        return this._inputProvince.getValue();
    }

    public setIsland(v: string): void {
        this._inputIsland.setValue(v);
    }

    public getIsland(): string {
        return this._inputIsland.getValue();
    }

    public setPort(v: string): void {
        this._inputPort.setValue(v);
    }

    public getPort(): string {
        return this._inputPort.getValue();
    }

    public setEmail(v: string): void {
        this._inputEmail.setValue(v);
    }

    public getEmail(): string {
        return this._inputEmail.getValue();
    }

    public setWeb(v: string): void {
        this._inputWeb.setValue(v);
    }

    public getWeb(): string {
        return this._inputWeb.getValue();
    }

    public setArocReference(v: string): void {
        this._inputArocReference.setValue(v);
    }

    public getArocReference(): string {
        return this._inputArocReference.getValue();
    }

    public setArocRegion(v: string): void {
        this._inputArocRegion.setValue(v);
    }

    public getArocRegion(): string {
        return this._inputArocRegion.getValue();
    }

    public setArocNumber(v: string): void {
        this._inputArocNumber.setValue(v);
    }

    public getArocNumber(): string {
        return this._inputArocNumber.getValue();
    }

    public setArocAuthorizedBoats(v: number): void {
        this._inputArocAuthorizedBoats.setValue(v > 0 ? `${v}` : '');
    }

    public getArocAuthorizedBoats(): number {
        const raw = this._inputArocAuthorizedBoats.getValue().trim();
        if (raw === '') return 0;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
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
        this.setProvince('');
        this.setIsland('');
        this.setPort('');
        this.setEmail('');
        this.setWeb('');
        this.setArocReference('');
        this.setArocRegion('');
        this.setArocNumber('');
        this.setArocAuthorizedBoats(0);
    }

}