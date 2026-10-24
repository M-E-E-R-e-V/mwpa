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
    SelectBottemBorderOnly2,
    Switch2
} from 'bambooo';
import {OrganizationEntry} from '../../Api/Organization';
import {VehicleEntry} from '../../Api/Vehicle';
import {VehicleDriverEntry} from '../../Api/VehicleDriver';
import {DateRangeButton} from '../../Widget/DateRangeButton';

/**
 * Snapshot of all currently selected tour filter values. Empty strings
 * / 0 mean "no filter for this field" — the consumer should drop those
 * before sending to the backend.
 */
export type TourFilterValues = {
    period_from: string;
    period_to: string;
    organization_id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    search: string;
    only_without_tracks: boolean;
};

export type TourFilterApplyFn = (values: TourFilterValues) => void;

const ALL_OPTION = {key: '', value: '— all —'};

/**
 * Tour Filter Card.
 * Lives next to the tour list and is toggled via the page's filter
 * button. Mirrors {@link SightingFilter} minus the Species select; the
 * shared widget contract (getValues / setOnApply / resetValues) keeps
 * both pages structurally identical.
 */
export class TourFilter extends Card2 {

    protected _dateRange: DateRangeButton;
    protected _selectOrganization: SelectBottemBorderOnly2;
    protected _selectVehicle: SelectBottemBorderOnly2;
    protected _selectDriver: SelectBottemBorderOnly2;
    protected _inputSearch: Input2;
    protected _switchOnlyWithoutTracks: Switch2;
    protected _onApply: TourFilterApplyFn|null = null;

    public constructor() {
        super({});

        this.getMainElement().addClass('tour-filter');
        this.setTitle(new LangTextV2({text: 'Filter'}));
        this.hide();

        const btnClose = new ButtonDefault2({icon: 'fa fa-times'});
        btnClose.appendTo(this.getToolsElement());
        btnClose.setOnClickFn(() => {
            this.hide();
        });

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBodyElement());

        const row = new FormRow2({});
        row.appendTo(body);

        const groupPeriod = new FormGroup2({label: new LangTextV2({text: 'Period'})});
        groupPeriod.appendTo(row.createCol(2));
        this._dateRange = new DateRangeButton(groupPeriod.getElement());

        const groupOrganization = new FormGroup2({label: new LangTextV2({text: 'Organization'})});
        groupOrganization.appendTo(row.createCol(2));
        this._selectOrganization = TourFilter._buildSelect(groupOrganization.getElement());

        const groupVehicle = new FormGroup2({label: new LangTextV2({text: 'Vehicle'})});
        groupVehicle.appendTo(row.createCol(2));
        this._selectVehicle = TourFilter._buildSelect(groupVehicle.getElement());

        const groupDriver = new FormGroup2({label: new LangTextV2({text: 'Driver'})});
        groupDriver.appendTo(row.createCol(2));
        this._selectDriver = TourFilter._buildSelect(groupDriver.getElement());

        const groupSearch = new FormGroup2({label: new LangTextV2({text: 'Search'})});
        groupSearch.appendTo(row.createCol(3));
        this._inputSearch = new Input2({type: InputType2.text});
        this._inputSearch.appendTo(groupSearch);
        this._inputSearch.setPlaceholder('persons / tour-fid …');

        const groupOnlyWithoutTracks = new FormGroup2({label: new LangTextV2({text: 'Without tracks'})});
        groupOnlyWithoutTracks.appendTo(row.createCol(1));
        this._switchOnlyWithoutTracks = new Switch2({label: 'only'});
        this._switchOnlyWithoutTracks.appendTo(groupOnlyWithoutTracks);

        const actions = jQuery('<div class="text-right pt-1"/>').appendTo(body);

        const btnReset = new ButtonDefault2({title: 'Reset', icon: 'fa fa-undo'});
        btnReset.appendTo(actions);
        btnReset.setOnClickFn(() => {
            this.resetValues();

            if (this._onApply) {
                this._onApply(this.getValues());
            }
        });

        actions.append(' ');

        const btnApply = new ButtonDefault2({title: 'Apply', icon: 'fa fa-check', btnClass: ButtonClass2.primary});
        btnApply.appendTo(actions);
        btnApply.setOnClickFn(() => {
            if (this._onApply) {
                this._onApply(this.getValues());
            }
        });
    }

    private static _buildSelect(parent: ComponentType): SelectBottemBorderOnly2 {
        const select = new SelectBottemBorderOnly2(parent);
        TourFilter._populateSelect(select, []);
        return select;
    }

    private static _populateSelect(select: SelectBottemBorderOnly2, entries: readonly {key: string; value: string;}[]): void {
        select.clearValues();
        select.setValues([ALL_OPTION, ...entries]);
        select.setSelectedValue('');
    }

    public setOrganizationList(list: OrganizationEntry[]): void {
        TourFilter._populateSelect(
            this._selectOrganization,
            list.map((entry) => ({key: `${entry.id}`, value: entry.description}))
        );
    }

    public setVehicleList(list: VehicleEntry[]): void {
        TourFilter._populateSelect(
            this._selectVehicle,
            list.map((entry) => ({key: `${entry.id}`, value: entry.name}))
        );
    }

    public setDriverList(list: VehicleDriverEntry[]): void {
        TourFilter._populateSelect(
            this._selectDriver,
            list.map((entry) => ({key: `${entry.id}`, value: entry.user.name}))
        );
    }

    public setOnApply(fn: TourFilterApplyFn): void {
        this._onApply = fn;
    }

    public getValues(): TourFilterValues {
        const organizationId = parseInt(this._selectOrganization.getSelectedValue() || '0', 10);
        const vehicleId = parseInt(this._selectVehicle.getSelectedValue() || '0', 10);
        const driverId = parseInt(this._selectDriver.getSelectedValue() || '0', 10);

        return {
            period_from: this._dateRange.getStartIso(),
            period_to: this._dateRange.getEndIso(),
            organization_id: Number.isFinite(organizationId) ? organizationId : 0,
            vehicle_id: Number.isFinite(vehicleId) ? vehicleId : 0,
            vehicle_driver_id: Number.isFinite(driverId) ? driverId : 0,
            search: this._inputSearch.getValue().trim(),
            only_without_tracks: this._switchOnlyWithoutTracks.isEnable()
        };
    }

    public resetValues(): void {
        this._dateRange.clear();
        this._selectOrganization.setSelectedValue('');
        this._selectVehicle.setSelectedValue('');
        this._selectDriver.setSelectedValue('');
        this._inputSearch.setValue('');
        this._switchOnlyWithoutTracks.setEnable(false);
    }

    public isActive(): boolean {
        const v = this.getValues();
        return v.period_from !== ''
            || v.period_to !== ''
            || v.organization_id > 0
            || v.vehicle_id > 0
            || v.vehicle_driver_id > 0
            || v.search !== ''
            || v.only_without_tracks;
    }

}