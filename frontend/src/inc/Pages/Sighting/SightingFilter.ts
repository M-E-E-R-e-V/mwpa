import {
    ButtonClass,
    ButtonDefault,
    Card,
    ComponentType,
    FormGroup,
    FormRow,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    SelectBottemBorderOnly2
} from 'bambooo';
import {OrganizationEntry} from '../../Api/Organization';
import {SpeciesEntry} from '../../Api/Species';
import {VehicleEntry} from '../../Api/Vehicle';
import {VehicleDriverEntry} from '../../Api/VehicleDriver';
import {DateRangeButton} from '../../Widget/DateRangeButton';

/**
 * Snapshot of all currently selected filter values. Empty strings / 0 mean "no filter
 * for this field" — the consumer should drop those before sending to the backend.
 */
export type SightingFilterValues = {
    period_from: string;
    period_to: string;
    species_id: number;
    organization_id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    search: string;
};

export type SightingFilterApplyFn = (values: SightingFilterValues) => void;

const ALL_OPTION = {key: '', value: '— all —'};

/**
 * Sighting Filter Card.
 * Lives next to the list and is toggled via the page's filter button. Holds the
 * active filter state, exposes it via {@link getValues}, and notifies the page on
 * Apply / Reset via {@link setOnApply}.
 */
export class SightingFilter extends Card {

    protected _dateRange: DateRangeButton;
    protected _selectSpecies: SelectBottemBorderOnly2;
    protected _selectOrganization: SelectBottemBorderOnly2;
    protected _selectVehicle: SelectBottemBorderOnly2;
    protected _selectDriver: SelectBottemBorderOnly2;
    protected _inputSearch: InputBottemBorderOnly2;
    protected _onApply: SightingFilterApplyFn|null = null;

    public constructor(elementObject: ComponentType) {
        super(elementObject);

        this.getMainElement().addClass('sighting-filter');
        this.setTitle(new LangText('Filter'));
        this.hide();

        const btnClose = new ButtonDefault(this.getToolsElement(), undefined, 'fa fa-times');
        btnClose.setOnClickFn(() => {
            this.hide();
        });

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBodyElement());

        // Single compact row: period + 4 selects + search (col-2 each, ~equal width).
        const row = new FormRow(body);

        const groupPeriod = new FormGroup(row.createCol(2), new LangText('Period'));
        this._dateRange = new DateRangeButton(groupPeriod);

        const groupSpecies = new FormGroup(row.createCol(2), new LangText('Species'));
        this._selectSpecies = SightingFilter._buildSelect(groupSpecies);

        const groupOrganization = new FormGroup(row.createCol(2), new LangText('Organization'));
        this._selectOrganization = SightingFilter._buildSelect(groupOrganization);

        const groupVehicle = new FormGroup(row.createCol(2), new LangText('Vehicle'));
        this._selectVehicle = SightingFilter._buildSelect(groupVehicle);

        const groupDriver = new FormGroup(row.createCol(2), new LangText('Driver'));
        this._selectDriver = SightingFilter._buildSelect(groupDriver);

        const groupSearch = new FormGroup(row.createCol(2), new LangText('Search'));
        this._inputSearch = new InputBottemBorderOnly2(groupSearch, undefined, InputType.text);
        this._inputSearch.setPlaceholder('note / recognizable …');

        // Buttons row, right-aligned, no separate footer to keep the card flat.
        const actions = jQuery('<div class="text-right pt-1"/>').appendTo(body);

        const btnReset = new ButtonDefault(actions, 'Reset', 'fa fa-undo');
        btnReset.setOnClickFn(() => {
            this.resetValues();

            if (this._onApply) {
                this._onApply(this.getValues());
            }
        });

        actions.append(' ');

        const btnApply = new ButtonDefault(actions, 'Apply', 'fa fa-check', ButtonClass.primary);
        btnApply.setOnClickFn(() => {
            if (this._onApply) {
                this._onApply(this.getValues());
            }
        });
    }

    /**
     * Construct a Select with the "all" placeholder. SelectBottemBorderOnly2.setValues
     * appends, so we (re)initialise via _populateSelect everywhere the list changes.
     */
    private static _buildSelect(parent: ComponentType): SelectBottemBorderOnly2 {
        const select = new SelectBottemBorderOnly2(parent);
        SightingFilter._populateSelect(select, []);
        return select;
    }

    /**
     * Replace all options of a select with [ALL_OPTION, ...entries] and restore "all"
     * as the selected value. Clears existing options first because setValues appends.
     */
    private static _populateSelect(select: SelectBottemBorderOnly2, entries: ReadonlyArray<{key: string; value: string}>): void {
        select.clearValues();
        select.setValues([ALL_OPTION, ...entries]);
        select.setSelectedValue('');
    }

    /**
     * Populate the species dropdown. Pass the same list the page already loaded for
     * the table to avoid a second round-trip.
     * @param {SpeciesEntry[]} list
     */
    public setSpeciesList(list: SpeciesEntry[]): void {
        SightingFilter._populateSelect(
            this._selectSpecies,
            list.map((entry) => ({key: `${entry.id}`, value: entry.name}))
        );
    }

    /**
     * Populate the organization dropdown.
     * @param {OrganizationEntry[]} list
     */
    public setOrganizationList(list: OrganizationEntry[]): void {
        SightingFilter._populateSelect(
            this._selectOrganization,
            list.map((entry) => ({key: `${entry.id}`, value: entry.description}))
        );
    }

    /**
     * Populate the vehicle dropdown.
     * @param {VehicleEntry[]} list
     */
    public setVehicleList(list: VehicleEntry[]): void {
        SightingFilter._populateSelect(
            this._selectVehicle,
            list.map((entry) => ({key: `${entry.id}`, value: entry.name}))
        );
    }

    /**
     * Populate the driver dropdown.
     * @param {VehicleDriverEntry[]} list
     */
    public setDriverList(list: VehicleDriverEntry[]): void {
        SightingFilter._populateSelect(
            this._selectDriver,
            list.map((entry) => ({key: `${entry.id}`, value: entry.user.name}))
        );
    }

    /**
     * Subscribe to Apply / Reset events. The callback receives the snapshot read
     * straight from the inputs, never null.
     * @param {SightingFilterApplyFn} fn
     */
    public setOnApply(fn: SightingFilterApplyFn): void {
        this._onApply = fn;
    }

    /**
     * Snapshot of all selected filter values. Empty / 0 means "no filter set for that field".
     * @return {SightingFilterValues}
     */
    public getValues(): SightingFilterValues {
        const speciesId = parseInt(this._selectSpecies.getSelectedValue() || '0', 10);
        const organizationId = parseInt(this._selectOrganization.getSelectedValue() || '0', 10);
        const vehicleId = parseInt(this._selectVehicle.getSelectedValue() || '0', 10);
        const driverId = parseInt(this._selectDriver.getSelectedValue() || '0', 10);

        return {
            period_from: this._dateRange.getStartIso(),
            period_to: this._dateRange.getEndIso(),
            species_id: Number.isFinite(speciesId) ? speciesId : 0,
            organization_id: Number.isFinite(organizationId) ? organizationId : 0,
            vehicle_id: Number.isFinite(vehicleId) ? vehicleId : 0,
            vehicle_driver_id: Number.isFinite(driverId) ? driverId : 0,
            search: this._inputSearch.getValue().trim()
        };
    }

    /**
     * Reset every input back to "no filter".
     */
    public resetValues(): void {
        this._dateRange.clear();
        this._selectSpecies.setSelectedValue('');
        this._selectOrganization.setSelectedValue('');
        this._selectVehicle.setSelectedValue('');
        this._selectDriver.setSelectedValue('');
        this._inputSearch.setValue('');
    }

    /**
     * True when at least one filter field is set — handy for the page to show a
     * "filter active" badge.
     * @return {boolean}
     */
    public isActive(): boolean {
        const v = this.getValues();
        return v.period_from !== ''
            || v.period_to !== ''
            || v.species_id > 0
            || v.organization_id > 0
            || v.vehicle_id > 0
            || v.vehicle_driver_id > 0
            || v.search !== '';
    }

}