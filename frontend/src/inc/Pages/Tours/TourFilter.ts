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
    SelectBottemBorderOnly2,
    Switch
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
export class TourFilter extends Card {

    protected _dateRange: DateRangeButton;
    protected _selectOrganization: SelectBottemBorderOnly2;
    protected _selectVehicle: SelectBottemBorderOnly2;
    protected _selectDriver: SelectBottemBorderOnly2;
    protected _inputSearch: InputBottemBorderOnly2;
    protected _switchOnlyWithoutTracks: Switch;
    protected _onApply: TourFilterApplyFn|null = null;

    public constructor(elementObject: ComponentType) {
        super(elementObject);

        this.getMainElement().addClass('tour-filter');
        this.setTitle(new LangText('Filter'));
        this.hide();

        const btnClose = new ButtonDefault(this.getToolsElement(), undefined, 'fa fa-times');
        btnClose.setOnClickFn(() => {
            this.hide();
        });

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBodyElement());

        const row = new FormRow(body);

        const groupPeriod = new FormGroup(row.createCol(2), new LangText('Period'));
        this._dateRange = new DateRangeButton(groupPeriod);

        const groupOrganization = new FormGroup(row.createCol(2), new LangText('Organization'));
        this._selectOrganization = TourFilter._buildSelect(groupOrganization);

        const groupVehicle = new FormGroup(row.createCol(2), new LangText('Vehicle'));
        this._selectVehicle = TourFilter._buildSelect(groupVehicle);

        const groupDriver = new FormGroup(row.createCol(2), new LangText('Driver'));
        this._selectDriver = TourFilter._buildSelect(groupDriver);

        const groupSearch = new FormGroup(row.createCol(3), new LangText('Search'));
        this._inputSearch = new InputBottemBorderOnly2(groupSearch, undefined, InputType.text);
        this._inputSearch.setPlaceholder('persons / tour-fid …');

        const groupOnlyWithoutTracks = new FormGroup(row.createCol(1), new LangText('Without tracks'));
        this._switchOnlyWithoutTracks = new Switch(
            groupOnlyWithoutTracks,
            'tour-filter-only-without-tracks',
            'only'
        );

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

    private static _buildSelect(parent: ComponentType): SelectBottemBorderOnly2 {
        const select = new SelectBottemBorderOnly2(parent);
        TourFilter._populateSelect(select, []);
        return select;
    }

    private static _populateSelect(select: SelectBottemBorderOnly2, entries: ReadonlyArray<{key: string; value: string}>): void {
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