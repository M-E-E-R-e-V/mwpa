import {Lang} from '../../Lang';
import {
    ButtonClass2,
    ButtonDefault2,
    Card2,
    ComponentType,
    FormGroup2,
    FormRow2,
    Input2,
    InputType2,
    LangTextV2,
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
    include_old: boolean;
};

export type SightingFilterApplyFn = (values: SightingFilterValues) => void;

const ALL_OPTION = {key: '', value: '— all —'};

/**
 * Sighting Filter Card.
 * Lives next to the list and is toggled via the page's filter button. Holds the
 * active filter state, exposes it via {@link getValues}, and notifies the page on
 * Apply / Reset via {@link setOnApply}.
 */
export class SightingFilter extends Card2 {

    protected _dateRange: DateRangeButton;
    protected _selectSpecies: SelectBottemBorderOnly2;
    protected _selectOrganization: SelectBottemBorderOnly2;
    protected _selectVehicle: SelectBottemBorderOnly2;
    protected _selectDriver: SelectBottemBorderOnly2;
    protected _inputSearch: Input2;
    protected _onApply: SightingFilterApplyFn|null = null;

    public constructor() {
        super({});

        this.getMainElement().addClass('sighting-filter');
        this.setTitle(new LangTextV2({text: 'Filter'}));
        this.hide();

        const btnClose = new ButtonDefault2({icon: 'fa fa-times'});
        btnClose.appendTo(this.getToolsElement());
        btnClose.setOnClickFn(() => {
            this.hide();
        });

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBodyElement());

        // Single compact row: period + 4 selects + search (col-2 each, ~equal width).
        const row = new FormRow2({});
        row.appendTo(body);

        const groupPeriod = new FormGroup2({label: new LangTextV2({text: 'Period'})});
        groupPeriod.appendTo(row.createCol(2));
        this._dateRange = new DateRangeButton(groupPeriod.getElement());

        const groupSpecies = new FormGroup2({label: new LangTextV2({text: 'Species'})});
        groupSpecies.appendTo(row.createCol(2));
        this._selectSpecies = SightingFilter._buildSelect(groupSpecies.getElement());

        const groupOrganization = new FormGroup2({label: new LangTextV2({text: 'Organization'})});
        groupOrganization.appendTo(row.createCol(2));
        this._selectOrganization = SightingFilter._buildSelect(groupOrganization.getElement());

        const groupVehicle = new FormGroup2({label: new LangTextV2({text: 'Vehicle'})});
        groupVehicle.appendTo(row.createCol(2));
        this._selectVehicle = SightingFilter._buildSelect(groupVehicle.getElement());

        const groupDriver = new FormGroup2({label: new LangTextV2({text: 'Driver'})});
        groupDriver.appendTo(row.createCol(2));
        this._selectDriver = SightingFilter._buildSelect(groupDriver.getElement());

        const groupSearch = new FormGroup2({label: new LangTextV2({text: 'Search'})});
        groupSearch.appendTo(row.createCol(2));
        this._inputSearch = new Input2({type: InputType2.text});
        this._inputSearch.appendTo(groupSearch);
        this._inputSearch.setPlaceholder(Lang.i().l('note / recognizable …'));

        /* "Show old data" toggle — mixes the hand-maintained historical sightings (sighting_old) into the list. */
        const oldWrap = jQuery('<div class="pt-1"/>').appendTo(body);
        jQuery('<input type="checkbox" id="mwpa-filter-include-old">').appendTo(oldWrap);
        jQuery('<label for="mwpa-filter-include-old" class="ml-1 mb-0"/>').text(Lang.i().l('Alte Daten (manuell erfasst) einblenden')).appendTo(oldWrap);

        // Buttons row, right-aligned, no separate footer to keep the card flat.
        const actions = jQuery('<div class="text-right pt-1"/>').appendTo(body);

        const btnReset = new ButtonDefault2({title: Lang.i().l('Reset'), icon: 'fa fa-undo'});
        btnReset.appendTo(actions);
        btnReset.setOnClickFn(() => {
            this.resetValues();

            if (this._onApply) {
                this._onApply(this.getValues());
            }
        });

        actions.append(' ');

        const btnApply = new ButtonDefault2({title: Lang.i().l('Apply'), icon: 'fa fa-check', btnClass: ButtonClass2.primary});
        btnApply.appendTo(actions);
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
    private static _populateSelect(select: SelectBottemBorderOnly2, entries: readonly {key: string; value: string;}[]): void {
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
            search: this._inputSearch.getValue().trim(),
            include_old: jQuery('#mwpa-filter-include-old').prop('checked') === true
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
        jQuery('#mwpa-filter-include-old').prop('checked', false);
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