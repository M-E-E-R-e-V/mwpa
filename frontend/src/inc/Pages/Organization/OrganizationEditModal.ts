/* global JQuery */
import {Lang} from '../../Lang';
import {
    FormRow2,
    Input2,
    InputType2,
    ModalDialog2,
    ModalDialogType2
} from 'bambooo';
import {FormLayout} from '../../Widget/FormLayout';

/**
 * Create / edit an organization (v2): sections for general data, home
 * position (with OSM check link), contact and the AROC office-report fields.
 */
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
     * "Show on map" link under the home position
     * @protected
     */
    protected _mapLink: JQuery<HTMLAnchorElement>;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        // general -----------------------------------------------------------------------------------------------------

        const general = FormLayout.section(body, 'fas fa-building', 'General');
        const rowGeneral = new FormRow2({});
        rowGeneral.appendTo(general);

        this._inputName = FormLayout.input(rowGeneral.createCol(12), 'Name', {
            icon: 'fas fa-signature',
            placeholder: 'e.g. Oceano Barcos S.L.',
            required: true
        });

        const rowPlace = new FormRow2({});
        rowPlace.appendTo(general);

        this._inputCountry = FormLayout.input(rowPlace.createCol(4), 'Country', {
            icon: 'fas fa-flag',
            placeholder: 'e.g. ES'
        });

        this._inputLocation = FormLayout.input(rowPlace.createCol(8), 'Location', {
            icon: 'fas fa-city',
            placeholder: 'e.g. La Gomera'
        });

        // home position -----------------------------------------------------------------------------------------------

        const position = FormLayout.section(
            body,
            'fas fa-map-marker-alt',
            'Home position',
            'Map centre for tours and sightings. Decimal degrees (WGS84), south and west are negative.'
        );

        const rowPosition = new FormRow2({});
        rowPosition.appendTo(position);

        this._inputLat = FormLayout.input(rowPosition.createCol(6), 'Lat', {
            icon: 'fas fa-arrows-alt-v',
            placeholder: 'e.g. 28.0831',
            suffix: '°'
        });

        this._inputLon = FormLayout.input(rowPosition.createCol(6), 'Lon', {
            icon: 'fas fa-arrows-alt-h',
            placeholder: 'e.g. -17.3344',
            suffix: '°'
        });

        this._mapLink = FormLayout.link(position, 'Show position on OpenStreetMap');
        this._mapLink.parent().addClass('mt-n2 mb-3');

        this._inputLat.getElement().on('input', (): void => this._updateMapLink());
        this._inputLon.getElement().on('input', (): void => this._updateMapLink());

        // contact -----------------------------------------------------------------------------------------------------

        const contact = FormLayout.section(body, 'fas fa-address-card', 'Contact');
        const rowContact = new FormRow2({});
        rowContact.appendTo(contact);

        this._inputEmail = FormLayout.input(rowContact.createCol(6), 'E-Mail', {
            icon: 'fas fa-envelope',
            placeholder: 'info@example.com',
            htmlType: 'email'
        });

        this._inputWeb = FormLayout.input(rowContact.createCol(6), 'Website', {
            icon: 'fas fa-globe',
            placeholder: 'https://',
            htmlType: 'url'
        });

        // AROC office report ------------------------------------------------------------------------------------------

        const aroc = FormLayout.section(
            body,
            'fas fa-file-alt',
            'Authority report (AROC)',
            'Only needed for the AROC export (sightings → Export).'
        );

        const rowAroc1 = new FormRow2({});
        rowAroc1.appendTo(aroc);

        this._inputProvince = FormLayout.input(rowAroc1.createCol(4), 'Province', {
            icon: 'fas fa-map',
            placeholder: 'e.g. Santa Cruz de Tenerife'
        });

        this._inputIsland = FormLayout.input(rowAroc1.createCol(4), 'Island', {
            icon: 'fas fa-mountain',
            placeholder: 'e.g. La Gomera'
        });

        this._inputPort = FormLayout.input(rowAroc1.createCol(4), 'Port', {
            icon: 'fas fa-anchor',
            placeholder: 'e.g. Puerto de Vueltas'
        });

        const rowAroc2 = new FormRow2({});
        rowAroc2.appendTo(aroc);

        this._inputArocRegion = FormLayout.input(rowAroc2.createCol(4), 'AROC region', {
            icon: 'fas fa-map-signs',
            placeholder: 'CAN / RES / AND'
        });

        this._inputArocNumber = FormLayout.input(rowAroc2.createCol(4), 'AROC number', {
            icon: 'fas fa-hashtag'
        });

        this._inputArocAuthorizedBoats = FormLayout.input(rowAroc2.createCol(4), 'Authorized boats', {
            icon: 'fas fa-ship',
            type: InputType2.number,
            placeholder: '0'
        });
        this._inputArocAuthorizedBoats.getElement().attr('min', '0');

        const rowAroc3 = new FormRow2({});
        rowAroc3.appendTo(aroc);

        this._inputArocReference = FormLayout.input(rowAroc3.createCol(12), 'AROC reference', {
            icon: 'fas fa-file-signature',
            placeholder: 'e.g. SGBTM/AUTAROC/CAN 44 2022'
        });

        this._updateMapLink();

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * Point the map link to the entered position (hidden while invalid).
     * @protected
     */
    protected _updateMapLink(): void {
        const lat = parseFloat(this._inputLat.getValue().replace(',', '.'));
        const lon = parseFloat(this._inputLon.getValue().replace(',', '.'));
        const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

        FormLayout.setLink(this._mapLink, valid ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}` : null);
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
        this._updateMapLink();
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
        this._updateMapLink();
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