import moment from 'moment';
import {EncounterCategorieEntry} from '../../Api/EncounterCategories';
import {SpeciesEntry} from '../../Api/Species';
import {VehicleDriverEntry} from '../../Api/VehicleDriver';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {FormRow} from '../../Bambooo/Content/Form/FormRow';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {Switch} from '../../Bambooo/Content/Form/Switch';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * SightingEditModalButtonClickFn
 */
type SightingEditModalButtonClickFn = () => void;

/**
 * SightingEditModal
 */
export class SightingEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

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
     * beaufort wind select
     * @protected
     */
    protected _beaufortWindSelect: SelectBottemBorderOnly2;

    /**
     * input date sight
     * @protected
     */
    protected _inputDateSight: InputBottemBorderOnly2;

    /**
     * input tour start
     * @protected
     */
    protected _inputTourStart: InputBottemBorderOnly2;

    /**
     * input tour end
     * @protected
     */
    protected _inputTourEnd: InputBottemBorderOnly2;

    /**
     * input duration from
     * @protected
     */
    protected _inputDurationFrom: InputBottemBorderOnly2;

    /**
     * input duration until
     * @protected
     */
    protected _inputDurationUntil: InputBottemBorderOnly2;

    /**
     * input distance coast
     * @protected
     */
    protected _inputDistanceCoast: InputBottemBorderOnly2;

    /**
     * switch photo taken
     * @protected
     */
    protected _switchPhotoTaken: Switch;

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
    protected _inputSpeciesCount: InputBottemBorderOnly2;

    /**
     * encounter select
     * @protected
     */
    protected _reactionSelect: SelectBottemBorderOnly2;

    /**
     * on save click
     * @protected
     */
    protected _onSaveClick: SightingEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'sightingmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const rowFirst = new FormRow(bodyCard);
        const groupVehicle = new FormGroup(rowFirst.createCol(6), 'Boat');
        this._vehicleSelect = new SelectBottemBorderOnly2(groupVehicle);

        const groupVehicleDriver = new FormGroup(rowFirst.createCol(6), 'Skipper');
        this._vehicleDriverSelect = new SelectBottemBorderOnly2(groupVehicleDriver);

        const groupbeaufortWind = new FormGroup(bodyCard, 'Wind/Seastate (Beaufort)');
        this._beaufortWindSelect = new SelectBottemBorderOnly2(groupbeaufortWind);

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

        const groupDateSight = new FormGroup(bodyCard, 'Date');
        this._inputDateSight = new InputBottemBorderOnly2(groupDateSight, 'datesight', InputType.date);

        const rowTourTime = new FormRow(bodyCard);
        const groupTourStart = new FormGroup(rowTourTime.createCol(6), 'Start of trip');
        this._inputTourStart = new InputBottemBorderOnly2(groupTourStart, 'sighttourstart', InputType.time);

        const groupTourEnd = new FormGroup(rowTourTime.createCol(6), 'End of trip');
        this._inputTourEnd = new InputBottemBorderOnly2(groupTourEnd, 'sighttourend', InputType.time);

        const rowDurationTime = new FormRow(bodyCard);
        const groupDurationFrom = new FormGroup(rowDurationTime.createCol(6), 'Sighting duration from');
        this._inputDurationFrom = new InputBottemBorderOnly2(groupDurationFrom, 'durationfrom', InputType.time);

        const groupDurationUntil = new FormGroup(rowDurationTime.createCol(6), 'until');
        this._inputDurationUntil = new InputBottemBorderOnly2(groupDurationUntil, 'durationuntil', InputType.time);

        const groupDistanceCoast = new FormGroup(bodyCard, 'Distance to nearest coast (nm)');
        this._inputDistanceCoast = new InputBottemBorderOnly2(groupDistanceCoast, 'distancecoast', InputType.number);

        const rowPG = new FormRow(bodyCard);
        const groupPhotoTaken = new FormGroup(rowPG.createCol(6), 'Photos taken');
        this._switchPhotoTaken = new Switch(groupPhotoTaken, 'phototaken');

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const groupDistanceCoastEstimationGPS = new FormGroup(rowPG.createCol(6), 'Estimation without GPS');
        // this.

        const groupSpecie = new FormGroup(bodyCard, 'Specie');
        this._specieSelect = new SelectBottemBorderOnly2(groupSpecie);

        const groupSpeciesCount = new FormGroup(bodyCard, 'Group-Size');
        this._inputSpeciesCount = new InputBottemBorderOnly2(groupSpeciesCount, undefined, InputType.number);

        const groupReaction = new FormGroup(bodyCard, 'Reaction');
        this._reactionSelect = new SelectBottemBorderOnly2(groupReaction);

        // buttons -----------------------------------------------------------------------------------------------------

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });
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
     * setVehicleList
     * @param list
     */
    public setVehicleList(list: SpeciesEntry[]): void {
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
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setVehicle(0);
        this.setVehicleDriver(0);
        this.setDateSight(moment(new Date()).format('YYYY.MM.DD'));
        this.setSpecie(0);
        this.setSpeciesCount(0);
        this.setReaction(-1);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: SightingEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}