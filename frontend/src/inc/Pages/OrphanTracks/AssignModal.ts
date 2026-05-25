import {
    ComponentType,
    FormGroup,
    FormRow,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType,
    SelectBottemBorderOnly2
} from 'bambooo';
import {OrphanTracksMatchCandidate} from '../../Api/OrphanTracks';
import {VehicleEntry} from '../../Api/Vehicle';
import {VehicleDriverEntry} from '../../Api/VehicleDriver';

const ALL_OPTION = {key: '0', value: '— any —'};

/**
 * Snapshot of the four picker values + the source bucket key
 * (tour_fid + device_id, which the modal carries through unchanged).
 */
export type AssignModalValues = {
    tour_fid: string;
    device_id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    date: string;
    tour_start: string;
    target_tour_id: number;
};

export type PickerChangeFn = (vehicleId: number, vehicleDriverId: number, date: string, tourStart: string) => void;

/**
 * AssignModal
 *
 * Dialog for reassigning the pending-track bucket of an orphan tour_fid
 * to an existing SightingTour. Four pickers (vehicle, driver, date,
 * tour_start) are prefilled from the parsed tour_fid; the host page
 * watches picker changes and pushes a refreshed candidate list via
 * {@link setCandidates}. The user picks a candidate via radio button.
 * Save is enabled only when a candidate is selected.
 */
export class AssignModal extends ModalDialog {

    protected _tourFid: string = '';
    protected _deviceId: number = 0;

    protected _selectVehicle: SelectBottemBorderOnly2;
    protected _selectDriver: SelectBottemBorderOnly2;
    protected _inputDate: InputBottemBorderOnly2;
    protected _inputStart: InputBottemBorderOnly2;

    protected _matchBody: JQuery<HTMLDivElement>;
    protected _hintInfo: JQuery<HTMLDivElement>;
    protected _selectedTargetId: number = 0;

    protected _vehicles: Map<number, VehicleEntry> = new Map();
    protected _drivers: Map<number, VehicleDriverEntry> = new Map();

    protected _onPickerChange: PickerChangeFn|null = null;

    public constructor(elementObject: ComponentType) {
        super(elementObject, 'orphantracksassignmodal', ModalDialogType.xlarge);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        // Pickers row
        const pickerRow = new FormRow(bodyCard);

        const groupVehicle = new FormGroup(pickerRow.createCol(3), new LangText('Vehicle'));
        this._selectVehicle = new SelectBottemBorderOnly2(groupVehicle);

        const groupDriver = new FormGroup(pickerRow.createCol(3), new LangText('Driver'));
        this._selectDriver = new SelectBottemBorderOnly2(groupDriver);

        const groupDate = new FormGroup(pickerRow.createCol(3), new LangText('Date'));
        this._inputDate = new InputBottemBorderOnly2(groupDate, 'orphandate', InputType.date);

        const groupStart = new FormGroup(pickerRow.createCol(3), new LangText('Tour start'));
        this._inputStart = new InputBottemBorderOnly2(groupStart, 'orphanstart', InputType.time);

        // Hint above the table
        this._hintInfo = jQuery<HTMLDivElement>('<div class="text-muted small pt-2 pb-1"/>').appendTo(bodyCard);

        // Match-table host
        const tableWrap = jQuery('<div class="orphan-match-table" style="max-height: 380px; overflow-y: auto;"/>').appendTo(bodyCard);
        this._matchBody = jQuery<HTMLDivElement>('<table class="table table-striped table-sm mb-0"><thead><tr>' +
            '<th style="width: 32px;"></th>' +
            '<th>Id</th>' +
            '<th>Date</th>' +
            '<th>Vehicle</th>' +
            '<th>Driver</th>' +
            '<th>Time</th>' +
            '<th class="text-right">Sightings</th>' +
            '<th class="text-right">Tracks</th>' +
            '</tr></thead><tbody></tbody></table>').appendTo(tableWrap).find('tbody') as unknown as JQuery<HTMLDivElement>;

        // Re-query on picker changes
        const fire = (): void => {
            this._selectedTargetId = 0;
            if (this._onPickerChange) {
                this._onPickerChange(this.getVehicleId(), this.getDriverId(), this.getDate(), this.getTourStart());
            }
            this._updateSaveEnabled();
        };

        this._selectVehicle.setChangeFn(fire);
        this._selectDriver.setChangeFn(fire);
        this._inputDate.getElement().on('change', fire);
        this._inputStart.getElement().on('change', fire);

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Assign tracks'), true);
        this._updateSaveEnabled();
    }

    public setVehicleList(list: VehicleEntry[]): void {
        this._vehicles.clear();
        for (const v of list) {
            this._vehicles.set(v.id, v);
        }
        this._selectVehicle.clearValues();
        this._selectVehicle.setValues([ALL_OPTION, ...list.map((v) => ({key: `${v.id}`, value: v.name}))]);
        this._selectVehicle.setSelectedValue('0');
    }

    public setDriverList(list: VehicleDriverEntry[]): void {
        this._drivers.clear();
        for (const d of list) {
            this._drivers.set(d.id, d);
        }
        this._selectDriver.clearValues();
        this._selectDriver.setValues([ALL_OPTION, ...list.map((d) => ({key: `${d.id}`, value: d.user.name}))]);
        this._selectDriver.setSelectedValue('0');
    }

    public setSource(tourFid: string, deviceId: number, vehicleId: number, vehicleDriverId: number, date: string, tourStart: string): void {
        this._tourFid = tourFid;
        this._deviceId = deviceId;
        this._selectVehicle.setSelectedValue(`${vehicleId}`);
        this._selectDriver.setSelectedValue(`${vehicleDriverId}`);
        this._inputDate.setValue(date);
        this._inputStart.setValue(tourStart);
        this._selectedTargetId = 0;
        this._hintInfo.text(`Source bucket: ${tourFid} (device ${deviceId})`);
        this._updateSaveEnabled();
    }

    public setOnPickerChange(fn: PickerChangeFn): void {
        this._onPickerChange = fn;
    }

    public getVehicleId(): number {
        return parseInt(this._selectVehicle.getSelectedValue() || '0', 10) || 0;
    }

    public getDriverId(): number {
        return parseInt(this._selectDriver.getSelectedValue() || '0', 10) || 0;
    }

    public getDate(): string {
        return this._inputDate.getValue().trim();
    }

    public getTourStart(): string {
        return this._inputStart.getValue().trim();
    }

    public getValues(): AssignModalValues {
        return {
            tour_fid: this._tourFid,
            device_id: this._deviceId,
            vehicle_id: this.getVehicleId(),
            vehicle_driver_id: this.getDriverId(),
            date: this.getDate(),
            tour_start: this.getTourStart(),
            target_tour_id: this._selectedTargetId
        };
    }

    public getTargetTourId(): number {
        return this._selectedTargetId;
    }

    public setCandidates(candidates: OrphanTracksMatchCandidate[]): void {
        this._matchBody.empty();

        if (candidates.length === 0) {
            this._matchBody.append('<tr><td colspan="8" class="text-center text-muted">No matching tours — relax a picker.</td></tr>');
            this._selectedTargetId = 0;
            this._updateSaveEnabled();
            return;
        }

        for (const c of candidates) {
            const vehicleName = this._vehicles.get(c.vehicle_id)?.name ?? `#${c.vehicle_id}`;
            const driverName = this._drivers.get(c.vehicle_driver_id)?.user.name ?? `#${c.vehicle_driver_id}`;
            const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);
            const row = jQuery(
                '<tr>' +
                `<td><input type="radio" name="orphantracks-target" value="${c.id}"></td>` +
                `<td>#${c.id}</td>` +
                `<td>${escape(c.date)}</td>` +
                `<td>${escape(vehicleName)}</td>` +
                `<td>${escape(driverName)}</td>` +
                `<td>${escape(c.tour_start)} – ${escape(c.tour_end)}</td>` +
                `<td class="text-right">${c.count_sightings}</td>` +
                `<td class="text-right">${c.count_trackings}</td>` +
                '</tr>'
            );
            row.find('input[type=radio]').on('change', () => {
                this._selectedTargetId = c.id;
                this._updateSaveEnabled();
            });
            this._matchBody.append(row);
        }
    }

    public override resetValues(): void {
        this._tourFid = '';
        this._deviceId = 0;
        this._selectVehicle.setSelectedValue('0');
        this._selectDriver.setSelectedValue('0');
        this._inputDate.setValue('');
        this._inputStart.setValue('');
        this._matchBody.empty();
        this._selectedTargetId = 0;
        this._hintInfo.text('');
        this._updateSaveEnabled();
    }

    private _updateSaveEnabled(): void {
        const btn = this.getButtonSave();
        if (!btn) {
            return;
        }
        if (this._selectedTargetId > 0) {
            btn.getElement().removeAttr('disabled');
        } else {
            btn.getElement().attr('disabled', 'disabled');
        }
    }

}