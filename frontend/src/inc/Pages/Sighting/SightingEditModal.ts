import {Lang} from '../../Lang';
import moment from 'moment';
import {EncounterCategorieEntry} from '../../Api/EncounterCategories';
import {SpeciesEntry} from '../../Api/Species';
import {Tours as ToursAPI} from '../../Api/Tours';
import {VehicleEntry} from '../../Api/Vehicle';
import {VehicleDriverEntry} from '../../Api/VehicleDriver';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';
import {LocationPickerInput} from '../../Widget/LocationPickerInput';
import {LocationPickerModal} from '../../Widget/LocationPickerModal';
import {
    FormGroup2,
    FormRow2,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2,
    SelectBottemBorderOnly2,
    Switch2,
    Textarea2
} from 'bambooo';

/**
 * SightingEditModal
 */
export class SightingEditModal extends ModalDialog2 {

    /**
     * id of entry
     * @protected
     */
    protected _sightingId: number|null = null;

    /**
     * vehicle select
     * @protected
     */
    protected _vehicleSelect: SelectBottemBorderOnly2;

    /**
     * vehicle driver select
     * @protected
     */
    protected _vehicleDriverSelect: SelectBottemBorderOnly2;

    /**
     * beaufort wind selects
     * @protected
     */
    protected _beaufortWindSelect: SelectBottemBorderOnly2;

    /**
     * input date sight
     * @protected
     */
    protected _inputDateSight: Input2;

    /**
     * input tour start
     * @protected
     */
    protected _inputTourStart: Input2;

    /**
     * input tour end
     * @protected
     */
    protected _inputTourEnd: Input2;

    /**
     * input duration from
     * @protected
     */
    protected _inputDurationFrom: Input2;

    /**
     * input duration until
     * @protected
     */
    protected _inputDurationUntil: Input2;

    protected _inputPositionBegin: LocationPickerInput;

    protected _inputPositionEnd: LocationPickerInput;

    protected _locationPicker: LocationPickerModal;

    protected _tourId: number|null = null;

    protected _routeCache: GeolocationCoordinates[]|null = null;

    /**
     * input distance coast
     * @protected
     */
    protected _inputDistanceCoast: Input2;

    /**
     * switch photo taken
     * @protected
     */
    protected _switchPhotoTaken: Switch2;

    // protected _switch

    /**
     * specie select
     * @protected
     */
    protected _specieSelect: SelectBottemBorderOnly2;

    /**
     * input group size
     * @protected
     */
    protected _inputSpeciesCount: Input2;

    /**
     * encounter select
     * @protected
     */
    protected _reactionSelect: SelectBottemBorderOnly2;

    /**
     * input other
     * @member {Input2}
     */
    protected _inputOther: Input2;

    /**
     * other boats
     * @member {Input2}
     */
    protected _otherBoats: Input2;

    /**
     * note textarea
     * @member {Textarea2}
     */
    protected _textareaNote: Textarea2;

    /**
     * constructor
     */
    public constructor() {
        super({id: 'sightingmodaldialog', modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const rowFirst = new FormRow2({});
        rowFirst.appendTo(bodyCard);
        const groupVehicle = new FormGroup2({label: new LangTextV2({text: 'Boat'})});
        groupVehicle.appendTo(rowFirst.createCol(6));
        this._vehicleSelect = new SelectBottemBorderOnly2(groupVehicle.getElement());

        const groupVehicleDriver = new FormGroup2({label: new LangTextV2({text: 'Skipper'})});
        groupVehicleDriver.appendTo(rowFirst.createCol(6));
        this._vehicleDriverSelect = new SelectBottemBorderOnly2(groupVehicleDriver.getElement());

        const groupbeaufortWind = new FormGroup2({label: new LangTextV2({text: 'Wind/Seastate (Beaufort)'})});
        groupbeaufortWind.appendTo(bodyCard);
        this._beaufortWindSelect = new SelectBottemBorderOnly2(groupbeaufortWind.getElement());

        for (let i = 0; i < 13; i++) {
            this._beaufortWindSelect.addValue({
                key: `${i}`,
                value: `${i}`
            });

            this._beaufortWindSelect.addValue({
                key: `${i}.5`,
                value: `${i}.5`
            });
        }

        const groupDateSight = new FormGroup2({label: new LangTextV2({text: 'Date'})});
        groupDateSight.appendTo(bodyCard);
        this._inputDateSight = new Input2({type: InputType2.date});
        this._inputDateSight.appendTo(groupDateSight);

        const rowTourTime = new FormRow2({});
        rowTourTime.appendTo(bodyCard);
        const groupTourStart = new FormGroup2({label: new LangTextV2({text: 'Start of trip'})});
        groupTourStart.appendTo(rowTourTime.createCol(6));
        this._inputTourStart = new Input2({type: InputType2.time});
        this._inputTourStart.appendTo(groupTourStart);

        const groupTourEnd = new FormGroup2({label: new LangTextV2({text: 'End of trip'})});
        groupTourEnd.appendTo(rowTourTime.createCol(6));
        this._inputTourEnd = new Input2({type: InputType2.time});
        this._inputTourEnd.appendTo(groupTourEnd);

        const rowDurationTime = new FormRow2({});
        rowDurationTime.appendTo(bodyCard);
        const groupDurationFrom = new FormGroup2({label: new LangTextV2({text: 'Sighting duration from'})});
        groupDurationFrom.appendTo(rowDurationTime.createCol(6));
        this._inputDurationFrom = new Input2({type: InputType2.time});
        this._inputDurationFrom.appendTo(groupDurationFrom);

        const groupDurationUntil = new FormGroup2({label: new LangTextV2({text: 'until'})});
        groupDurationUntil.appendTo(rowDurationTime.createCol(6));
        this._inputDurationUntil = new Input2({type: InputType2.time});
        this._inputDurationUntil.appendTo(groupDurationUntil);

        const groupPositionBegin = new FormGroup2({label: new LangTextV2({text: 'Position begin'})});
        groupPositionBegin.appendTo(bodyCard);
        this._inputPositionBegin = new LocationPickerInput(groupPositionBegin.getElement(), 'positionbegin');

        const grouPositionEnd = new FormGroup2({label: new LangTextV2({text: 'Position end'})});
        grouPositionEnd.appendTo(bodyCard);
        this._inputPositionEnd = new LocationPickerInput(grouPositionEnd.getElement(), 'positionend');

        this._locationPicker = new LocationPickerModal(jQuery('body'));

        const openPicker = (input: LocationPickerInput, mustBeAfter?: () => GeolocationCoordinates | null): void => {
            input.setOnRequestPicker((current, accept) => {
                this._locationPicker.resetValues();
                this._locationPicker.open(
                    current,
                    null,
                    (newValue) => {
                        accept(newValue);
                    },
                    mustBeAfter ? mustBeAfter() : null
                );
                this._loadRouteIntoPicker().catch(() => undefined);
            });
        };
        openPicker(this._inputPositionBegin);
        /*
         * End-picker must come AFTER begin along the route — pass begin's
         * current value at open-time so the picker can warn if the user
         * picks a position the boat passed earlier than the begin.
         */
        openPicker(this._inputPositionEnd, () => this._inputPositionBegin.getGcValue());

        const groupDistanceCoast = new FormGroup2({label: new LangTextV2({text: 'Distance to nearest coast (nm)'})});
        groupDistanceCoast.appendTo(bodyCard);
        this._inputDistanceCoast = new Input2({type: InputType2.number});
        this._inputDistanceCoast.appendTo(groupDistanceCoast);
        this._inputDistanceCoast.setReadOnly(true);

        const rowPG = new FormRow2({});
        rowPG.appendTo(bodyCard);
        const groupPhotoTaken = new FormGroup2({label: new LangTextV2({text: 'Photos taken'})});
        groupPhotoTaken.appendTo(rowPG.createCol(6));
        this._switchPhotoTaken = new Switch2({});
        this._switchPhotoTaken.appendTo(groupPhotoTaken);

        const groupDistanceCoastEstimationGPS = new FormGroup2({
            label: new LangTextV2({text: 'Estimation without GPS'})
        });
        groupDistanceCoastEstimationGPS.appendTo(rowPG.createCol(6));
        // this.

        const groupSpecie = new FormGroup2({label: new LangTextV2({text: 'Species'})});
        groupSpecie.appendTo(bodyCard);
        this._specieSelect = new SelectBottemBorderOnly2(groupSpecie.getElement());

        const groupSpeciesCount = new FormGroup2({label: new LangTextV2({text: 'Number of animals'})});
        groupSpeciesCount.appendTo(bodyCard);
        this._inputSpeciesCount = new Input2({type: InputType2.number});
        this._inputSpeciesCount.appendTo(groupSpeciesCount);

        const groupReaction = new FormGroup2({label: new LangTextV2({text: 'Reaction'})});
        groupReaction.appendTo(bodyCard);
        this._reactionSelect = new SelectBottemBorderOnly2(groupReaction.getElement());

        const groupOther = new FormGroup2({label: new LangTextV2({text: 'Other'})});
        groupOther.appendTo(bodyCard);
        this._inputOther = new Input2({type: InputType2.text});
        this._inputOther.appendTo(groupOther);

        const groupOtherBoats = new FormGroup2({label: new LangTextV2({text: 'Other boats present'})});
        groupOtherBoats.appendTo(bodyCard);
        this._otherBoats = new Input2({type: InputType2.text});
        this._otherBoats.appendTo(groupOtherBoats);

        const groupNote = new FormGroup2({label: new LangTextV2({text: 'Note'})});
        groupNote.appendTo(bodyCard);
        this._textareaNote = new Textarea2({});
        this._textareaNote.appendTo(groupNote);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * getSightingId
     */
    public getSightingId(): number|null {
        return this._sightingId;
    }

    /**
     * setSightingId
     * @param id
     */
    public setSightingId(id: number|null): void {
        this._sightingId = id;
    }

    public setTourId(tourId: number|null): void {
        if (tourId !== this._tourId) {
            this._routeCache = null;
        }
        this._tourId = tourId;
    }

    protected async _loadRouteIntoPicker(): Promise<void> {
        if (this._tourId === null) {
            return;
        }

        if (this._routeCache === null) {
            const tracking = await ToursAPI.getTrackingList(this._tourId);
            if (!tracking) {
                return;
            }

            const sorted = new Map<number, GeolocationCoordinates>();
            for (const raw of tracking.positions) {
                try {
                    const pos = JSON.parse(raw) as GeolocationCoordinates;
                    if (pos.timestamp && pos.longitude !== undefined && pos.latitude !== undefined) {
                        sorted.set(pos.timestamp, pos);
                    }
                } catch {
                    /* skip malformed entries — tracking has lots of legacy strings */
                }
            }

            this._routeCache = [...sorted].sort(([a], [b]) => a - b).map(([, v]) => v);
        }

        this._locationPicker.setRoute(this._routeCache);
    }

    /**
     * setVehicleList
     * @param list
     */
    public setVehicleList(list: VehicleEntry[]): void {
        this._vehicleSelect.clearValues();

        this._vehicleSelect.addValue({
            key: '0',
            value: 'Please select a Boat!'
        });

        for (const vehicle of list) {
            this._vehicleSelect.addValue({
                key: `${vehicle.id}`,
                value: vehicle.name
            });
        }
    }

    /**
     * setVehicle
     * @param vehicleId
     */
    public setVehicle(vehicleId: number): void {
        this._vehicleSelect.setSelectedValue(`${vehicleId}`);
    }

    /**
     * getVehicle
     */
    public getVehicle(): number {
        return parseInt(this._vehicleSelect.getSelectedValue(), 10) || 0;
    }

    /**
     * setVehicleDriverList
     * @param list
     */
    public setVehicleDriverList(list: VehicleDriverEntry[]): void {
        this._vehicleDriverSelect.clearValues();

        this._vehicleDriverSelect.addValue({
            key: '0',
            value: 'Please select a Skipper!'
        });

        for (const driver of list) {
            this._vehicleDriverSelect.addValue({
                key: `${driver.id}`,
                value: driver.user.name
            });
        }
    }

    /**
     * setVehicleDriver
     * @param driverId
     */
    public setVehicleDriver(driverId: number): void {
        this._vehicleDriverSelect.setSelectedValue(`${driverId}`);
    }

    /**
     * getVehicleDriver
     */
    public getVehicleDriver(): number {
        return parseInt(this._vehicleDriverSelect.getSelectedValue(), 10) || 0;
    }

    /**
     * setBeaufortWind
     * @param state
     */
    public setBeaufortWind(state: string): void {
        this._beaufortWindSelect.setSelectedValue(`${state}`);
    }

    /**
     * getBeaufortWind
     */
    public getBeaufortWind(): string {
        return this._beaufortWindSelect.getSelectedValue();
    }

    /**
     * setDateSight
     * @param date
     */
    public setDateSight(date: string): void {
        this._inputDateSight.setValue(date);
    }

    /**
     * getDateSight
     */
    public getDateSight(): string {
        return this._inputDateSight.getValue();
    }

    /**
     * Set the tour start time.
     * @param {string} time - String time.
     */
    public setTourStart(time: string): void {
        this._inputTourStart.setValue(time);
    }

    /**
     * Return the tour start time.
     * @returns {string}
     */
    public getTourStart(): string {
        return this._inputTourStart.getValue();
    }

    /**
     * Set the tour end time.
     * @param {string} time - String time.
     */
    public setTourEnd(time: string): void {
        this._inputTourEnd.setValue(time);
    }

    /**
     * Return the tour end time.
     * @returns {string}
     */
    public getTourEnd(): string {
        return this._inputTourEnd.getValue();
    }

    /**
     * Set duration from time.
     * @param {string} time
     */
    public setDurationFrom(time: string): void {
        this._inputDurationFrom.setValue(time);
    }

    /**
     * Return the duration from.
     * @returns {string}
     */
    public getDurationFrom(): string {
        return this._inputDurationFrom.getValue();
    }

    /**
     * Set the duration until time.
     * @param {string} time
     */
    public setDurationUntil(time: string): void {
        this._inputDurationUntil.setValue(time);
    }

    public setPositionBegin(position: string|GeolocationCoordinates): void {
        this._inputPositionBegin.setValue(position);
    }

    public getPositionBegin(): string {
        return this._inputPositionBegin.getValue();
    }

    public setPositionEnd(position: string|GeolocationCoordinates): void {
        this._inputPositionEnd.setValue(position);
    }

    public getPositionEnd(): string {
        return this._inputPositionEnd.getValue();
    }

    /**
     * Return the duration until.
     * @returns {string}
     */
    public getDurationUntil(): string {
        return this._inputDurationUntil.getValue();
    }

    /**
     * Set the distance to coast input.
     * @param {string} distance
     */
    public setDistanceCoast(distance: string): void {
        this._inputDistanceCoast.setValue(distance);
    }

    /**
     * setSpeciesList
     * @param list
     */
    public setSpeciesList(list: SpeciesEntry[]): void {
        this._specieSelect.clearValues();

        this._specieSelect.addValue({
            key: '0',
            value: 'Please select a specie!'
        });

        for (const specie of list) {
            if (!specie.isdeleted) {
                this._specieSelect.addValue({
                    key: `${specie.id}`,
                    value: specie.name.split(', ')[0]
                });
            }
        }
    }

    /**
     * setSpecie
     * @param specieId
     */
    public setSpecie(specieId: number): void {
        this._specieSelect.setSelectedValue(`${specieId}`);
    }

    /**
     * getSpecie
     */
    public getSpecie(): number {
        return parseInt(this._specieSelect.getSelectedValue(), 10) || 0;
    }

    /**
     * setSpeciesCount
     * @param count
     */
    public setSpeciesCount(count: number): void {
        this._inputSpeciesCount.setValue(`${count}`);
    }

    /**
     * getSpeciesCount
     */
    public getSpeciesCount(): number {
        return parseInt(this._inputSpeciesCount.getValue(), 10) || 0;
    }

    /**
     * setReactionList
     * @param list
     */
    public setReactionList(list: EncounterCategorieEntry[]): void {
        this._reactionSelect.clearValues();

        this._reactionSelect.addValue({
            key: '-1',
            value: 'Please select a encounter categorie!'
        });

        for (const encounter of list) {
            if (!encounter.isdeleted) {
                this._reactionSelect.addValue({
                    key: `${encounter.id}`,
                    value: encounter.name
                });
            }
        }
    }

    public setReaction(reactionId: number): void {
        this._reactionSelect.setSelectedValue(`${reactionId}`);
    }

    /**
     * getReaction
     */
    public getReaction(): number {
        return parseInt(this._reactionSelect.getSelectedValue(), 10) || 0;
    }

    /**
     * Set other information.
     * @param {string} other
     */
    public setOther(other: string): void {
        this._inputOther.setValue(other);
    }

    /**
     * Return the other information.
     * @returns {string}
     */
    public getOther(): string {
        return this._inputOther.getValue();
    }

    /**
     * Set other boats is present.
     * @param {string} otherBoats
     */
    public setOtherBoats(otherBoats: string): void {
        this._otherBoats.setValue(otherBoats);
    }

    /**
     * Return other boats present.
     * @returns {string}
     */
    public getOtherBoats(): string {
        return this._otherBoats.getValue();
    }

    /**
     * Set the note.
     * @param {string} note
     */
    public setNote(note: string): void {
        this._textareaNote.setValue(note);
    }

    /**
     * Return the note.
     * @returns {string}
     */
    public getNote(): string {
        return this._textareaNote.getValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setSightingId(null);
        this.setTourId(null);
        this.setVehicle(0);
        this.setVehicleDriver(0);
        this.setDateSight(moment(new Date()).format('YYYY.MM.DD'));
        this.setTourStart('');
        this.setTourEnd('');
        this.setDurationFrom('');
        this.setDurationUntil('');
        this.setPositionBegin('');
        this.setPositionEnd('');
        this.setDistanceCoast('');
        this.setSpecie(0);
        this.setSpeciesCount(0);
        this.setReaction(-1);
        this.setOther('');
        this.setOtherBoats('');
        this.setNote('');
    }

}