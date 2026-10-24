import {
    FormGroup2,
    FormRow2,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2
} from 'bambooo';


export class OrganizationEditModal extends ModalDialog2 {

    /**
     * ID from organization
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: Input2;

    /**
     * input country
     * @protected
     */
    protected _inputCountry: Input2;

    /**
     * input location
     * @protected
     */
    protected _inputLocation: Input2;

    /**
     * input lon
     * @protected
     */
    protected _inputLon: Input2;

    /**
     * input lat
     * @protected
     */
    protected _inputLat: Input2;

    /**
     * input province
     * @protected
     */
    protected _inputProvince: Input2;

    /**
     * input island
     * @protected
     */
    protected _inputIsland: Input2;

    /**
     * input port
     * @protected
     */
    protected _inputPort: Input2;

    /**
     * input email
     * @protected
     */
    protected _inputEmail: Input2;

    /**
     * input web
     * @protected
     */
    protected _inputWeb: Input2;

    /**
     * input AROC reference
     * @protected
     */
    protected _inputArocReference: Input2;

    /**
     * input AROC region (CAN/RES/AND)
     * @protected
     */
    protected _inputArocRegion: Input2;

    /**
     * input AROC number
     * @protected
     */
    protected _inputArocNumber: Input2;

    /**
     * input AROC authorized boats
     * @protected
     */
    protected _inputArocAuthorizedBoats: Input2;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupName = new FormGroup2({label: new LangTextV2({text: 'Name'})});
        groupName.appendTo(bodyCard);
        this._inputName = new Input2({});
        this._inputName.appendTo(groupName);

        const groupCountry = new FormGroup2({label: new LangTextV2({text: 'Country'})});
        groupCountry.appendTo(bodyCard);
        this._inputCountry = new Input2({});
        this._inputCountry.appendTo(groupCountry);

        const groupLocation = new FormGroup2({label: new LangTextV2({text: 'Location'})});
        groupLocation.appendTo(bodyCard);
        this._inputLocation = new Input2({});
        this._inputLocation.appendTo(groupLocation);

        const rowPosition = new FormRow2({});
        rowPosition.appendTo(bodyCard);

        const groupLon = new FormGroup2({label: new LangTextV2({text: 'Lon'})});
        groupLon.appendTo(rowPosition.createCol(6));
        this._inputLon = new Input2({});
        this._inputLon.appendTo(groupLon);

        const groupLat = new FormGroup2({label: new LangTextV2({text: 'Lat'})});
        groupLat.appendTo(rowPosition.createCol(6));
        this._inputLat = new Input2({});
        this._inputLat.appendTo(groupLat);

        // AROC office-report fields ---------------------------------------------------------------------------------

        jQuery('<hr/>').appendTo(bodyCard);
        jQuery('<h6 class="text-muted"></h6>').text('AROC').appendTo(bodyCard);

        const rowPlace = new FormRow2({});
        rowPlace.appendTo(bodyCard);

        const groupProvince = new FormGroup2({label: new LangTextV2({text: 'Province'})});
        groupProvince.appendTo(rowPlace.createCol(4));
        this._inputProvince = new Input2({});
        this._inputProvince.appendTo(groupProvince);

        const groupIsland = new FormGroup2({label: new LangTextV2({text: 'Island'})});
        groupIsland.appendTo(rowPlace.createCol(4));
        this._inputIsland = new Input2({});
        this._inputIsland.appendTo(groupIsland);

        const groupPort = new FormGroup2({label: new LangTextV2({text: 'Port'})});
        groupPort.appendTo(rowPlace.createCol(4));
        this._inputPort = new Input2({});
        this._inputPort.appendTo(groupPort);

        const rowContact = new FormRow2({});
        rowContact.appendTo(bodyCard);

        const groupEmail = new FormGroup2({label: new LangTextV2({text: 'E-Mail'})});
        groupEmail.appendTo(rowContact.createCol(6));
        this._inputEmail = new Input2({});
        this._inputEmail.appendTo(groupEmail);

        const groupWeb = new FormGroup2({label: new LangTextV2({text: 'Website'})});
        groupWeb.appendTo(rowContact.createCol(6));
        this._inputWeb = new Input2({});
        this._inputWeb.appendTo(groupWeb);

        const rowAroc1 = new FormRow2({});
        rowAroc1.appendTo(bodyCard);

        const groupArocRegion = new FormGroup2({label: new LangTextV2({text: 'AROC region'})});
        groupArocRegion.appendTo(rowAroc1.createCol(4));
        this._inputArocRegion = new Input2({});
        this._inputArocRegion.appendTo(groupArocRegion);

        const groupArocNumber = new FormGroup2({label: new LangTextV2({text: 'AROC number'})});
        groupArocNumber.appendTo(rowAroc1.createCol(4));
        this._inputArocNumber = new Input2({});
        this._inputArocNumber.appendTo(groupArocNumber);

        const groupArocBoats = new FormGroup2({label: new LangTextV2({text: 'Authorized boats'})});
        groupArocBoats.appendTo(rowAroc1.createCol(4));
        this._inputArocAuthorizedBoats = new Input2({type: InputType2.number});
        this._inputArocAuthorizedBoats.appendTo(groupArocBoats);

        const groupArocReference = new FormGroup2({label: new LangTextV2({text: 'AROC reference'})});
        groupArocReference.appendTo(bodyCard);
        this._inputArocReference = new Input2({});
        this._inputArocReference.appendTo(groupArocReference);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose('Close');
        this.addButtonSave('Save changes', true);
    }

    /**
     * Set id from organization
     * @param {number} id
     */
    public setOrganizationId(id: number): void {
        this._id = id;
    }

    /**
     * Return id from organization
     * @returns {number|null}
     */
    public getOrganizationId(): number|null {
        return this._id;
    }

    /**
     * Set the organization name
     * @param {string} name
     */
    public override setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Return the organization name
     * @returns {string}
     */
    public override getName(): string {
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

        if (raw === '') {
            return 0;
        }

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