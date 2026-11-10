/* global JQuery */
import {LangTextV2, ModalDialog2, ModalDialogType2} from 'bambooo';
import moment from 'moment';
import {BehaviouralStateEntry} from '../../Api/BehaviouralStates';
import {EncounterCategorieEntry} from '../../Api/EncounterCategories';
import {SightingSaveRequest, SightingsEntry} from '../../Api/Sightings';
import {SpeciesEntry} from '../../Api/Species';
import {Tours as ToursAPI} from '../../Api/Tours';
import {VehicleEntry} from '../../Api/Vehicle';
import {VehicleDriverEntry} from '../../Api/VehicleDriver';
import {Lang} from '../../Lang';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';
import {UtilDistanceCoast} from '../../Utils/UtilDistanceCoast';
import {LocationPickerInput} from '../../Widget/LocationPickerInput';
import {LocationPickerModal} from '../../Widget/LocationPickerModal';
import {SightingDetailsView} from './SightingDetailsView';
import {SightingHistoryView} from './SightingHistoryView';

/**
 * Option of a select / chip list (id + label).
 */
type SightingEditOption = {
    id: number;
    label: string;
};

/**
 * SightingEditModal
 *
 * "Add new sighting" / "Edit sighting" in three tabs: the essentials
 * (trip, species, times, position), group & behaviour, and more; an
 * existing sighting also has a read-only "Computed" tab (meta data and the
 * values of the background services) and a "History" tab (who changed
 * what when). The tab
 * labels count the filled fields, so data on a hidden tab stays visible.
 * Required fields are checked inline before saving (the tab with the first
 * problem opens); the app's plausibility checks show as non-blocking hints.
 * Value semantics follow the app: yes/no/unknown = 1/0/-1, behaviours and
 * other species as id lists, frequent behaviours as free-text tags.
 */
export class SightingEditModal extends ModalDialog2 {

    /**
     * Fields with yes / no / unknown.
     */
    protected static readonly _TRI_STATES = [
        'juveniles',
        'calves',
        'newborns',
        'subgroups',
        'photo_taken',
        'distance_coast_estimation_gps'
    ] as const;

    /**
     * Tag suggestions for frequent behaviours (as in the app).
     */
    protected static readonly _TAG_SUGGESTIONS = ['SLP', 'SPY', 'TSL', 'Breach', 'Bow riding', 'Logging'];

    /**
     * A sighting longer than this is flagged (minutes, like the app).
     */
    protected static readonly _LONG_SIGHTING_MIN = 180;

    /**
     * Instance counter for unique DOM ids (pages may build the dialog more
     * than once, label[for] must not reach into another instance).
     */
    protected static _instances = 0;

    protected _uid: string;

    protected _sightingId: number | null = null;

    protected _tourId: number | null = null;

    protected _routeCache: GeolocationCoordinates[] | null = null;

    protected _form: JQuery;

    protected _tabs: JQuery;

    protected _meta: JQuery;

    protected _checks: JQuery;

    protected _panes: JQuery[] = [];

    protected _distanceText: JQuery;

    protected _controls = new Map<string, JQuery>();

    protected _inputPositionBegin: LocationPickerInput;

    protected _inputPositionEnd: LocationPickerInput;

    protected _locationPicker: LocationPickerModal;

    protected _behaviourList: JQuery;

    protected _otherSpeciesList: JQuery;

    protected _otherSpeciesSelect: JQuery;

    protected _otherSpecies: number[] = [];

    protected _tagList: JQuery;

    protected _tagInput: JQuery<HTMLInputElement>;

    protected _tags: string[] = [];

    protected _details: SightingDetailsView;

    protected _detailsIndex: number;

    protected _detailsTab: JQuery;

    protected _history: SightingHistoryView;

    protected _historyIndex: number;

    protected _historyTab: JQuery;

    protected _names = {
        vehicle: new Map<number, string>(),
        driver: new Map<number, string>(),
        species: new Map<number, string>(),
        reaction: new Map<number, string>(),
        behaviour: new Map<number, string>()
    };

    /**
     * constructor
     */
    public constructor() {
        super({id: 'sightingmodaldialog', modalType: ModalDialogType2.large});

        SightingEditModal._instances++;
        this._uid = `mwpa-se${SightingEditModal._instances}`;

        this._innerElement.addClass('modal-dialog-scrollable');

        this._form = jQuery('<form class="mwpa-sighting-form" novalidate autocomplete="off"/>').appendTo(this.getBody());
        this._form.on('submit', (event) => {
            event.preventDefault();
        });

        const bar = jQuery('<div class="mwpa-sighting-tabbar"/>').appendTo(this._form);
        this._tabs = jQuery('<ul class="nav nav-underline mwpa-sighting-tabs" role="tablist"/>').appendTo(bar);
        this._meta = jQuery('<div class="mwpa-sighting-meta"/>').appendTo(bar);
        this._checks = jQuery('<div class="mwpa-sighting-checks"/>').appendTo(this._form);

        // essentials ----------------------------------------------------------------------------------------------
        const main = this._pane('Sighting');
        this._field(main, 'col-md-5', 'Boat', 'vehicle_id', this._select('vehicle_id'), true);
        this._field(main, 'col-md-4', 'Skipper', 'vehicle_driver_id', this._select('vehicle_driver_id'), true);
        this._field(main, 'col-md-3', 'Date', 'date', this._input('date', 'date'), true);

        this._field(main, 'col-6 col-md-3', 'Start of trip', 'tour_start', this._input('tour_start', 'time'));
        this._field(main, 'col-6 col-md-3', 'End of trip', 'tour_end', this._input('tour_end', 'time'));

        const beaufort = this._select('beaufort_wind');

        for (let i = 0; i <= 12; i++) {
            SightingEditModal._option(beaufort, `${i}`, `${i}`);

            if (i < 12) {
                SightingEditModal._option(beaufort, `${i}.5`, `${i}.5`);
            }
        }

        this._field(main, 'col-md-6', 'Wind/Seastate (Beaufort)', 'beaufort_wind', beaufort);

        SightingEditModal._divider(main);
        this._field(main, 'col-md-6', 'Species', 'species_id', this._select('species_id'), true);
        this._field(main, 'col-md-2', 'Number of animals', 'species_count', this._input('species_count', 'number').attr({min: 0, step: 1}), true);
        this._field(main, 'col-6 col-md-2', 'Sighting from', 'duration_from', this._input('duration_from', 'time'));
        this._field(main, 'col-6 col-md-2', 'until', 'duration_until', this._input('duration_until', 'time'));

        const beginBox = jQuery('<div/>');
        const endBox = jQuery('<div/>');
        this._field(main, 'col-md-6', 'Position begin', 'location_begin', beginBox, true);
        this._field(main, 'col-md-6', 'Position end', 'location_end', endBox);
        this._inputPositionBegin = new LocationPickerInput(beginBox, 'positionbegin');
        this._inputPositionEnd = new LocationPickerInput(endBox, 'positionend');
        this._distanceText = jQuery('<div class="form-text"/>').insertAfter(beginBox);

        this._locationPicker = new LocationPickerModal(jQuery('body'));
        this._wirePicker(this._inputPositionBegin);

        /*
         * End-picker must come AFTER begin along the route — pass begin's
         * current value at open-time so the picker can warn if the user
         * picks a position the boat passed earlier than the begin.
         */
        this._wirePicker(this._inputPositionEnd, () => this._inputPositionBegin.getGcValue());

        // group & behaviour ---------------------------------------------------------------------------------------
        const group = this._pane('Group & behaviour');
        this._field(group, 'col-6 col-md-3', 'Juveniles', 'juveniles', this._triState('juveniles'));
        this._field(group, 'col-6 col-md-3', 'Calves', 'calves', this._triState('calves'));
        this._field(group, 'col-6 col-md-3', 'Newborns', 'newborns', this._triState('newborns'));
        this._field(group, 'col-6 col-md-3', 'Subgroups', 'subgroups', this._triState('subgroups'));

        const structure = this._select('group_structure_id');
        SightingEditModal._option(structure, '0', Lang.i().l('Not recorded'));
        SightingEditModal._option(structure, '1', Lang.i().l('widely dispersed'));
        SightingEditModal._option(structure, '2', Lang.i().l('dispersed'));
        SightingEditModal._option(structure, '3', Lang.i().l('loose'));
        SightingEditModal._option(structure, '4', Lang.i().l('tight'));
        this._field(group, 'col-md-6', 'Group structure', 'group_structure_id', structure);
        this._field(group, 'col-md-6', 'Reaction', 'reaction_id', this._select('reaction_id'));

        SightingEditModal._divider(group);
        this._behaviourList = jQuery('<div class="mwpa-chip-list"/>');
        this._field(group, 'col-12', 'Behaviour', 'behaviours', this._behaviourList);

        const tagBox = jQuery('<div class="mwpa-tag-input form-control form-control-sm"/>');
        this._tagList = jQuery('<span class="mwpa-tag-list"/>').appendTo(tagBox);
        this._tagInput = jQuery<HTMLInputElement>('<input type="text" class="mwpa-tag-entry"/>')
        .attr({placeholder: Lang.i().l('Add with Enter'), list: `${this._uid}-tags`})
        .appendTo(tagBox);
        const suggestions = jQuery('<datalist/>').attr('id', `${this._uid}-tags`).appendTo(tagBox);

        for (const tag of SightingEditModal._TAG_SUGGESTIONS) {
            jQuery('<option/>').attr('value', tag).appendTo(suggestions);
        }

        this._field(group, 'col-12', 'Frequent behaviours of individuals', 'freq_behaviour', tagBox);
        this._wireTags(tagBox);
        this._field(group, 'col-12', 'Recognizable animals', 'recognizable_animals', this._input('recognizable_animals', 'text'));

        // more ----------------------------------------------------------------------------------------------------
        const more = this._pane('More');
        const otherBox = jQuery('<div class="mwpa-other-species"/>');
        this._otherSpeciesSelect = jQuery('<select class="form-select form-select-sm"/>').appendTo(otherBox);
        this._otherSpeciesList = jQuery('<div class="mwpa-chip-list"/>').appendTo(otherBox);
        this._field(more, 'col-12', 'Other species', 'other_species', otherBox);
        this._wireOtherSpecies();

        this._field(more, 'col-md-6', 'Photos taken', 'photo_taken', this._triState('photo_taken'));
        this._field(more, 'col-md-6', 'Distance to coast estimated without GPS', 'distance_coast_estimation_gps', this._triState('distance_coast_estimation_gps'));
        this._field(more, 'col-md-6', 'Other boats present', 'other_vehicle', this._input('other_vehicle', 'text'));
        this._field(more, 'col-md-6', 'Other', 'other', this._input('other', 'text'));

        const note = jQuery('<textarea class="form-control form-control-sm" rows="3"/>').attr('name', 'note');
        this._controls.set('note', note);
        this._field(more, 'col-12', 'Note', 'note', note);

        // computed data + history (existing sightings only) ------------------------------------------------------
        this._detailsIndex = this._panes.length;
        const detailsRow = this._pane('Computed');
        this._detailsTab = this._tabs.children().last();
        this._details = new SightingDetailsView(jQuery('<div class="col-12"/>').appendTo(detailsRow));

        this._historyIndex = this._panes.length;
        const historyRow = this._pane('History');
        this._historyTab = this._tabs.children().last();
        this._history = new SightingHistoryView(
            jQuery('<div class="col-12"/>').appendTo(historyRow),
            (field, value) => this._historyValue(field, value),
            (count) => {
                this._historyTab.find('.mwpa-sighting-tab-count').text(count > 0 ? `${count}` : '');
            }
        );

        this._form.on('change input', () => {
            this._updateChecks();
        });

        // buttons -------------------------------------------------------------------------------------------------
        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save'), true);
    }

    /**
     * Add a <option> to a select.
     * @param {JQuery} select
     * @param {string} value
     * @param {string} label
     */
    protected static _option(select: JQuery, value: string, label: string): void {
        jQuery('<option/>').attr('value', value).text(label).appendTo(select);
    }

    protected static _divider(row: JQuery): void {
        jQuery('<div class="col-12"><hr class="mwpa-sighting-divider"/></div>').appendTo(row);
    }

    /**
     * Time "9:5" / "09:05:00" → "09:05" for <input type="time">.
     * @param {string|undefined} value
     * @return {string}
     */
    protected static _time(value: string | undefined): string {
        const match = (/^(\d{1,2}):(\d{1,2})/u).exec((value ?? '').trim());

        if (!match) {
            return '';
        }

        return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
    }

    /**
     * Stored date → YYYY-MM-DD. Legacy rows carry a UTC timestamp of the
     * local midnight ("2023-07-23 23:00:00.000Z"), those are read as local
     * date; "YYYY.MM.DD" from old imports is accepted too.
     * @param {string|undefined} value
     * @return {string}
     */
    protected static _date(value: string | undefined): string {
        const text = (value ?? '').trim();

        if ((/^\d{4}-\d{2}-\d{2}$/u).test(text)) {
            return text;
        }

        if ((/^\d{4}\.\d{2}\.\d{2}$/u).test(text)) {
            return text.replace(/\./gu, '-');
        }

        const parsed = moment(text.replace(' ', 'T'));

        return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
    }

    /**
     * Ids of a JSON id map (`{"0":"5"}`) or list.
     * @param {string|undefined} raw
     * @return {number[]}
     */
    protected static _ids(raw: string | undefined): number[] {
        try {
            const data = JSON.parse(raw ?? '') as unknown;

            if (data !== null && typeof data === 'object') {
                return Object.values(data as Record<string, unknown>)
                .map((value) => parseInt(`${value}`, 10))
                .filter((id) => Number.isInteger(id) && id > 0);
            }
        } catch {
            // empty or legacy text
        }

        return [];
    }

    /**
     * Ids as JSON id map like the app writes it, '' for none.
     * @param {number[]} ids
     * @return {string}
     */
    protected static _idMap(ids: number[]): string {
        return ids.length > 0 ? JSON.stringify(Object.fromEntries(ids.map((id, i) => [`${i}`, `${id}`]))) : '';
    }

    /**
     * Tags of a JSON string list.
     * @param {string|undefined} raw
     * @return {string[]}
     */
    protected static _tagsOf(raw: string | undefined): string[] {
        try {
            const data = JSON.parse(raw ?? '') as unknown;

            if (Array.isArray(data)) {
                return data.map((tag) => `${tag}`.trim()).filter((tag) => tag !== '');
            }
        } catch {
            // empty or legacy text
        }

        return [];
    }

    /**
     * Minutes of a "HH:mm", null when empty.
     * @param {string} value
     * @return {number|null}
     */
    protected static _minutes(value: string): number | null {
        const match = (/^(\d{1,2}):(\d{2})/u).exec(value);
        return match ? (parseInt(match[1], 10) * 60) + parseInt(match[2], 10) : null;
    }

    public getSightingId(): number | null {
        return this._sightingId;
    }

    public setTourId(tourId: number | null): void {
        if (tourId !== this._tourId) {
            this._routeCache = null;
        }

        this._tourId = tourId;
    }

    /**
     * Boats for new sightings (active ones) plus the names of all boats, so a
     * sighting of a retired boat still shows its boat.
     * @param {VehicleEntry[]} active
     * @param {VehicleEntry[]} all
     */
    public setVehicleList(active: VehicleEntry[], all: VehicleEntry[] = active): void {
        this._fillSelect(this._controls.get('vehicle_id')!, 'Please select a boat', active.map((v) => ({id: v.id, label: v.name})));
        this._remember(this._names.vehicle, all.map((v) => ({id: v.id, label: v.name})));
    }

    public setVehicleDriverList(list: VehicleDriverEntry[]): void {
        const options = list.map((d) => ({id: d.id, label: d.user.name}));
        this._fillSelect(this._controls.get('vehicle_driver_id')!, 'Please select a skipper', options);
        this._remember(this._names.driver, options);
    }

    public setSpeciesList(list: SpeciesEntry[]): void {
        const all = list.map((s) => ({id: s.id, label: s.name.split(', ')[0]}));
        const active = list.filter((s) => !s.isdeleted).map((s) => ({id: s.id, label: s.name.split(', ')[0]}));

        this._fillSelect(this._controls.get('species_id')!, 'Please select a species', active);
        this._fillSelect(this._otherSpeciesSelect, 'Add species …', active);
        this._remember(this._names.species, all);
    }

    public setReactionList(list: EncounterCategorieEntry[]): void {
        const active = list.filter((c) => !c.isdeleted).map((c) => ({id: c.id, label: c.name}));

        this._fillSelect(this._controls.get('reaction_id')!, 'Not recorded', active);
        this._remember(this._names.reaction, list.map((c) => ({id: c.id, label: c.name})));
    }

    public setBehaviourList(list: BehaviouralStateEntry[]): void {
        this._behaviourList.empty();

        for (const b of [...list].filter((e) => !e.isdeleted).sort((a, c) => a.name.localeCompare(c.name))) {
            this._behaviourChip(b.id, b.name);
        }

        this._remember(this._names.behaviour, list.map((b) => ({id: b.id, label: b.name})));
    }

    /**
     * Empty form for a new sighting (today, Beaufort 0, unknowns).
     */
    public override resetValues(): void {
        this._sightingId = null;
        this.setTourId(null);
        this._form.find('.is-invalid').removeClass('is-invalid');
        this._form.find('input[type=text], input[type=time], input[type=number], textarea').val('');
        this._form.find('option[data-extra]').remove();
        this._behaviourList.find('[data-extra]').remove();
        this._behaviourList.find('input').prop('checked', false);
        this._value('vehicle_id', '0');
        this._value('vehicle_driver_id', '0');
        this._value('species_id', '0');
        this._value('reaction_id', '0');
        this._value('group_structure_id', '0');
        this._value('beaufort_wind', '0');
        this._value('date', moment().format('YYYY-MM-DD'));
        this._value('species_count', '1');

        for (const name of SightingEditModal._TRI_STATES) {
            this._value(name, '-1');
        }

        this._inputPositionBegin.setValue('');
        this._inputPositionEnd.setValue('');
        this._otherSpecies = [];
        this._renderOtherSpecies();
        this._tags = [];
        this._renderTags();
        this._distanceText.text(Lang.i().l('The distance to the coast is calculated when saving.'));
        this._meta.empty();
        this._details.clear();
        this._detailsTab.addClass('d-none');
        this._history.clear();
        this._historyTab.addClass('d-none');
        this._showPane(0);
        this._updateChecks();
    }

    /**
     * Open the empty form for a new sighting.
     */
    public openNew(): void {
        this.resetValues();
        this.setTitle(new LangTextV2({text: 'Add new sighting'}));
        this.show();
    }

    /**
     * Open the form with an existing sighting.
     * @param {SightingsEntry} entry
     */
    public openEntry(entry: SightingsEntry): void {
        this.resetValues();
        this.setTitle(new LangTextV2({text: 'Edit Sighting'}));
        this._sightingId = entry.id;
        this.setTourId(entry.tour_id ?? null);

        this._valueKnown('vehicle_id', entry.vehicle_id, this._names.vehicle);
        this._valueKnown('vehicle_driver_id', entry.vehicle_driver_id, this._names.driver);
        this._valueKnown('species_id', entry.species_id, this._names.species);
        this._valueKnown('reaction_id', Math.max(0, entry.reaction_id ?? 0), this._names.reaction);
        this._valueOrAdd('beaufort_wind', `${entry.beaufort_wind ?? '0'}`.trim() || '0');
        this._value('date', SightingEditModal._date(entry.date));
        this._value('tour_start', SightingEditModal._time(entry.tour_start));
        this._value('tour_end', SightingEditModal._time(entry.tour_end));
        this._value('duration_from', SightingEditModal._time(entry.duration_from));
        this._value('duration_until', SightingEditModal._time(entry.duration_until));
        this._value('species_count', `${entry.species_count ?? 0}`);
        this._value('group_structure_id', `${entry.group_structure_id ?? 0}`);
        this._value('recognizable_animals', entry.recognizable_animals ?? '');
        this._value('other', entry.other ?? '');
        this._value('other_vehicle', entry.other_vehicle ?? '');
        this._value('note', entry.note ?? '');

        for (const name of SightingEditModal._TRI_STATES) {
            const value = entry[name] ?? -1;
            this._value(name, [-1, 0, 1].includes(value) ? `${value}` : '-1');
        }

        for (const id of SightingEditModal._ids(entry.behaviours)) {
            let chip = this._behaviourList.find(`input[value="${id}"]`);

            if (chip.length === 0) {
                chip = this._behaviourChip(id, this._names.behaviour.get(id) ?? `#${id}`, true);
            }

            chip.prop('checked', true);
        }

        this._otherSpecies = SightingEditModal._ids(entry.other_species);
        this._renderOtherSpecies();
        this._tags = SightingEditModal._tagsOf(entry.freq_behaviour);
        this._renderTags();

        this._inputPositionBegin.setValue(entry.location_begin ?? '');
        this._inputPositionEnd.setValue(entry.location_end ?? '');

        const distance = parseFloat(entry.distance_coast ?? '');

        if (Number.isFinite(distance) && distance > 0) {
            this._distanceText.text(`${Lang.i().l('Distance to nearest coast (nm)')}: ${UtilDistanceCoast.meterToM(distance, true)}`);
        }

        jQuery('<span/>').text(`#${entry.id}`).appendTo(this._meta);
        this._detailsTab.removeClass('d-none');
        this._historyTab.removeClass('d-none');

        if (entry.tour_id) {
            jQuery('<span/>').text(`${Lang.i().l('Tour')} #${entry.tour_id}`).appendTo(this._meta);
        }

        this._updateChecks();
        this.show();
    }

    /**
     * The form as save request (`id: 0` for a new sighting).
     * @return {SightingSaveRequest}
     */
    public getValues(): SightingSaveRequest {
        const num = (name: string): number => parseInt(this._value(name), 10) || 0;
        const tri = (name: string): number => {
            const value = parseInt(this._value(name), 10);
            return [-1, 0, 1].includes(value) ? value : -1;
        };
        const behaviours = this._behaviourList.find('input:checked').map((_i, el) => parseInt(`${jQuery(el).val()}`, 10)).get();

        return {
            id: this._sightingId ?? 0,
            vehicle_id: num('vehicle_id'),
            vehicle_driver_id: num('vehicle_driver_id'),
            beaufort_wind: this._value('beaufort_wind'),
            date: this._value('date'),
            tour_start: this._value('tour_start'),
            tour_end: this._value('tour_end'),
            duration_from: this._value('duration_from'),
            duration_until: this._value('duration_until'),
            location_begin: this._inputPositionBegin.getValue(),
            location_end: this._inputPositionEnd.getGcValue() ? this._inputPositionEnd.getValue() : '',
            species_id: num('species_id'),
            species_count: num('species_count'),
            reaction_id: num('reaction_id'),
            other: this._value('other').trim(),
            other_vehicle: this._value('other_vehicle').trim(),
            note: this._value('note').trim(),
            photo_taken: tri('photo_taken'),
            distance_coast_estimation_gps: tri('distance_coast_estimation_gps'),
            juveniles: tri('juveniles'),
            calves: tri('calves'),
            newborns: tri('newborns'),
            subgroups: tri('subgroups'),
            group_structure_id: num('group_structure_id'),
            behaviours: SightingEditModal._idMap(behaviours),
            other_species: SightingEditModal._idMap(this._otherSpecies),
            freq_behaviour: this._tags.length > 0 ? JSON.stringify(this._tags) : '',
            recognizable_animals: this._value('recognizable_animals').trim()
        };
    }

    /**
     * Mark missing required fields; true when the form can be saved.
     * Opens the tab of the first problem.
     * @return {boolean}
     */
    public validate(): boolean {
        for (const name of ['vehicle_id', 'vehicle_driver_id', 'date', 'species_id', 'species_count', 'location_begin']) {
            this._form.find(`[data-field="${name}"]`).toggleClass('is-invalid', !this._isFilled(name));
        }

        const first = this._form.find('[data-field].is-invalid').first();

        if (first.length > 0) {
            this._showPane(this._panes.findIndex((pane) => pane.has(first[0]).length > 0));
            first[0].scrollIntoView({behavior: 'smooth', block: 'center'});
            return false;
        }

        return true;
    }

    /**
     * Tab with its pane; returns the pane's row for the fields.
     * @param {string} title
     * @return {JQuery}
     */
    protected _pane(title: string): JQuery {
        const index = this._panes.length;
        const item = jQuery('<li class="nav-item" role="presentation"/>').appendTo(this._tabs);
        const button = jQuery('<button type="button" class="nav-link" role="tab"/>').appendTo(item);

        jQuery('<span/>').text(Lang.i().l(title)).appendTo(button);
        jQuery('<span class="mwpa-sighting-tab-count"/>').appendTo(button);
        button.on('click', () => {
            this._showPane(index);
        });

        const pane = jQuery('<div class="mwpa-sighting-pane" role="tabpanel"/>').appendTo(this._form);
        this._panes.push(pane);

        return jQuery('<div class="row g-3"/>').appendTo(pane);
    }

    protected _showPane(index: number): void {
        this._panes.forEach((pane, i) => {
            pane.toggleClass('d-none', i !== index);
        });

        this._tabs.find('.nav-link').each((i, el) => {
            jQuery(el).toggleClass('active', i === index).attr('aria-selected', `${i === index}`);
        });

        if (index === this._detailsIndex && this._sightingId !== null) {
            this._details.load(this._sightingId).then();
        }

        if (index === this._historyIndex && this._sightingId !== null) {
            this._history.load(this._sightingId).then();
        }
    }

    /**
     * Display text of a stored value for the history tab ('' = empty).
     * @param {string} field
     * @param {string} value
     * @return {string}
     */
    protected _historyValue(field: string, value: string): string {
        const lang = Lang.i();
        const id = parseInt(value, 10);
        const named = (names: Map<number, string>): string => id > 0 ? names.get(id) ?? `#${id}` : '';

        switch (field) {
            case 'vehicle_id':
                return named(this._names.vehicle);

            case 'vehicle_driver_id':
                return named(this._names.driver);

            case 'species_id':
                return named(this._names.species);

            case 'reaction_id':
                return id > 0 ? named(this._names.reaction) : lang.l('Not recorded');

            case 'tour_id':
                return id > 0 ? `#${id}` : '';

            case 'group_structure_id':
                return this._controls.get('group_structure_id')!.find(`option[value="${id}"]`).text() || value;

            case 'behaviours':
                return SightingEditModal._ids(value).map((b) => this._names.behaviour.get(b) ?? `#${b}`).join(', ');

            case 'other_species':
                return SightingEditModal._ids(value).map((sp) => this._names.species.get(sp) ?? `#${sp}`).join(', ');

            case 'freq_behaviour':
                return SightingEditModal._tagsOf(value).join(', ') || value;

            case 'location_begin':
            case 'location_end':
                return SightingEditModal._position(value);

            case 'distance_coast': {
                const meters = parseFloat(value);
                return Number.isFinite(meters) && meters > 0 ? `${UtilDistanceCoast.meterToM(meters, true)} nm` : '';
            }

            case 'deleted':
                return value === '1' ? lang.l('Yes') : lang.l('No');

            case 'sighting_type':
                return lang.l(['Normal', 'Short entry', 'Notice', 'Free entry'][id] ?? value);

            default:
                if ((SightingEditModal._TRI_STATES as readonly string[]).includes(field)) {
                    return lang.l({'-1': 'Unknown', '0': 'No', '1': 'Yes'}[value] ?? value);
                }

                return value;
        }
    }

    /**
     * "lat, lon" of a JSON position ('' when there is none).
     * @param {string} raw
     * @return {string}
     */
    protected static _position(raw: string): string {
        try {
            const position = JSON.parse(raw) as {latitude?: unknown; longitude?: unknown;} | null;
            const lat = Number(position?.latitude);
            const lon = Number(position?.longitude);

            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            }
        } catch {
            // legacy text
        }

        return raw === 'null' ? '' : raw;
    }

    /**
     * Labelled field with an error text for required ones.
     * @param {JQuery} row
     * @param {string} col
     * @param {string} label
     * @param {string} name
     * @param {JQuery} control
     * @param {boolean} required
     */
    protected _field(row: JQuery, col: string, label: string, name: string, control: JQuery, required: boolean = false): void {
        const box = jQuery('<div class="mwpa-sighting-field"/>').addClass(col).attr('data-field', name).appendTo(row);
        const caption = jQuery('<label class="form-label"/>').text(Lang.i().l(label)).appendTo(box);

        if (required) {
            jQuery('<span class="text-danger ms-1" aria-hidden="true">*</span>').appendTo(caption);
            jQuery('<div class="mwpa-sighting-error"/>').text(Lang.i().l('Required')).appendTo(box);
        }

        const target = control.is('input, select, textarea') ? control : control.find('input, select').first();

        if (target.length > 0) {
            const id = `${this._uid}-${name}`;
            target.attr('id', id);
            caption.attr('for', id);
        }

        control.insertAfter(caption);
    }

    protected _select(name: string): JQuery {
        const select = jQuery('<select class="form-select form-select-sm"/>').attr('name', name);
        this._controls.set(name, select);
        return select;
    }

    protected _input(name: string, type: string): JQuery {
        const input = jQuery('<input class="form-control form-control-sm"/>').attr({name, type});
        this._controls.set(name, input);
        return input;
    }

    /**
     * Unknown / no / yes as compact select.
     * @param {string} name
     * @return {JQuery}
     */
    protected _triState(name: string): JQuery {
        const select = this._select(name);

        SightingEditModal._option(select, '-1', Lang.i().l('Unknown'));
        SightingEditModal._option(select, '0', Lang.i().l('No'));
        SightingEditModal._option(select, '1', Lang.i().l('Yes'));

        return select;
    }

    protected _value(name: string, value?: string): string {
        const control = this._controls.get(name)!;

        if (value !== undefined) {
            control.val(value);
        }

        return `${control.val() ?? ''}`;
    }

    protected _isFilled(name: string): boolean {
        switch (name) {
            case 'location_begin':
                return this._inputPositionBegin.getGcValue() !== null;

            case 'species_count':
                return (/^\d+$/u).test(this._value(name).trim());

            case 'date':
                return (/^\d{4}-\d{2}-\d{2}$/u).test(this._value(name));

            default:
                return !['', '0'].includes(this._value(name).trim());
        }
    }

    /**
     * Select a value, adding an option when the list lacks it (e.g. a
     * Beaufort value outside the half steps).
     * @param {string} name
     * @param {string} value
     */
    protected _valueOrAdd(name: string, value: string): void {
        const control = this._controls.get(name)!;

        if (control.find(`option[value="${value}"]`).length === 0) {
            jQuery('<option data-extra="1"/>').attr('value', value).text(value).appendTo(control);
        }

        control.val(value);
    }

    /**
     * Select an id; a retired / deleted entry that is no longer offered is
     * added (marked) so editing keeps it.
     * @param {string} name
     * @param {number|undefined} id
     * @param {Map} names
     */
    protected _valueKnown(name: string, id: number | undefined, names: Map<number, string>): void {
        const value = id ?? 0;
        const control = this._controls.get(name)!;

        if (value > 0 && control.find(`option[value="${value}"]`).length === 0) {
            jQuery('<option data-extra="1"/>')
            .attr('value', `${value}`)
            .text(`${names.get(value) ?? `#${value}`} (${Lang.i().l('inactive')})`)
            .appendTo(control);
        }

        control.val(`${value}`);
    }

    protected _fillSelect(control: JQuery, placeholder: string, options: SightingEditOption[]): void {
        control.empty();
        SightingEditModal._option(control, '0', Lang.i().l(placeholder));

        for (const option of [...options].sort((a, b) => a.label.localeCompare(b.label))) {
            SightingEditModal._option(control, `${option.id}`, option.label);
        }
    }

    protected _remember(target: Map<number, string>, options: SightingEditOption[]): void {
        target.clear();

        for (const option of options) {
            target.set(option.id, option.label);
        }
    }

    /**
     * Toggle chip (checkbox + label) of a behaviour.
     * @param {number} id
     * @param {string} label
     * @param {boolean} extra not offered anymore (deleted), only kept
     * @return {JQuery} the checkbox
     */
    protected _behaviourChip(id: number, label: string, extra: boolean = false): JQuery {
        const domId = `${this._uid}-behaviour-${id}`;
        const input = jQuery('<input type="checkbox" class="btn-check" autocomplete="off"/>')
        .attr({id: domId, value: id})
        .appendTo(this._behaviourList);
        const chip = jQuery('<label class="btn btn-sm btn-outline-secondary"/>').attr('for', domId).text(label).appendTo(this._behaviourList);

        if (extra) {
            input.attr('data-extra', '1');
            chip.attr('data-extra', '1');
        }

        return input;
    }

    protected _wireOtherSpecies(): void {
        this._otherSpeciesSelect.on('change', () => {
            const id = parseInt(`${this._otherSpeciesSelect.val()}`, 10) || 0;

            if (id > 0 && !this._otherSpecies.includes(id)) {
                this._otherSpecies.push(id);
                this._renderOtherSpecies();
            }

            this._otherSpeciesSelect.val('0');
        });

        this._otherSpeciesList.on('click', '[data-remove]', (event) => {
            const id = parseInt(`${jQuery(event.currentTarget).attr('data-remove')}`, 10);
            this._otherSpecies = this._otherSpecies.filter((other) => other !== id);
            this._renderOtherSpecies();
            this._updateChecks();
        });
    }

    protected _renderOtherSpecies(): void {
        this._otherSpeciesList.empty().toggleClass('d-none', this._otherSpecies.length === 0);
        this._otherSpeciesSelect.find('option').prop('disabled', false);

        for (const id of this._otherSpecies) {
            const chip = jQuery('<span class="mwpa-tag"/>').text(this._names.species.get(id) ?? `#${id}`).appendTo(this._otherSpeciesList);
            jQuery('<button type="button" class="btn-close"/>')
            .attr({'data-remove': id, 'aria-label': Lang.i().l('Remove')})
            .appendTo(chip);
            this._otherSpeciesSelect.find(`option[value="${id}"]`).prop('disabled', true);
        }
    }

    protected _wireTags(box: JQuery): void {
        const add = (): void => {
            const tag = `${this._tagInput.val() ?? ''}`.trim();

            if (tag !== '' && !this._tags.includes(tag)) {
                this._tags.push(tag);
                this._renderTags();
            }

            this._tagInput.val('');
        };

        this._tagInput.on('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                add();
            } else if (event.key === 'Backspace' && `${this._tagInput.val() ?? ''}` === '' && this._tags.length > 0) {
                this._tags.pop();
                this._renderTags();
            }
        });

        this._tagInput.on('change blur', add);

        box.on('click', (event) => {
            const remove = jQuery(event.target).closest('[data-tag]');

            if (remove.length > 0) {
                this._tags = this._tags.filter((tag) => tag !== `${remove.attr('data-tag')}`);
                this._renderTags();
                this._updateChecks();
            } else {
                this._tagInput.trigger('focus');
            }
        });
    }

    protected _renderTags(): void {
        this._tagList.empty();

        for (const tag of this._tags) {
            const chip = jQuery('<span class="mwpa-tag"/>').text(tag).appendTo(this._tagList);
            jQuery('<button type="button" class="btn-close"/>')
            .attr({'data-tag': tag, 'aria-label': Lang.i().l('Remove')})
            .appendTo(chip);
        }
    }

    protected _wirePicker(input: LocationPickerInput, mustBeAfter?: () => GeolocationCoordinates | null): void {
        input.setOnRequestPicker((current, accept) => {
            this._locationPicker.resetValues();
            this._locationPicker.open(
                current,
                null,
                (newValue) => {
                    accept(newValue);
                    this._form.trigger('change');
                },
                mustBeAfter ? mustBeAfter() : null
            );
            this._loadRouteIntoPicker().catch(() => undefined);
        });
    }

    protected async _loadRouteIntoPicker(): Promise<void> {
        if (this._tourId === null || this._tourId <= 0) {
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
                    // skip malformed entries — tracking has lots of legacy strings
                }
            }

            this._routeCache = [...sorted].sort(([a], [b]) => a - b).map(([, v]) => v);
        }

        this._locationPicker.setRoute(this._routeCache);
    }

    /**
     * Plausibility hints, filled-field counts on the tabs, and clearing the
     * required marks of fields that are filled meanwhile.
     */
    protected _updateChecks(): void {
        const values = this.getValues();

        this._renderHints(SightingEditModal._hints(values));

        const counts = [
            0,
            [values.juveniles, values.calves, values.newborns, values.subgroups].filter((v) => v !== -1).length +
                [values.group_structure_id, values.reaction_id].filter((v) => (v ?? 0) > 0).length +
                [values.behaviours, values.freq_behaviour, values.recognizable_animals].filter((v) => (v ?? '') !== '').length,
            [values.photo_taken, values.distance_coast_estimation_gps].filter((v) => v !== -1).length +
                [values.other_species, values.other_vehicle, values.other, values.note].filter((v) => (v ?? '') !== '').length
        ];

        this._tabs.find('.mwpa-sighting-tab-count').each((i, el) => {
            if (i < counts.length) {
                jQuery(el).text(counts[i] > 0 ? `${counts[i]}` : '');
            }
        });

        this._form.find('[data-field].is-invalid').each((_i, el) => {
            jQuery(el).toggleClass('is-invalid', !this._isFilled(jQuery(el).attr('data-field') ?? ''));
        });
    }

    /**
     * The app's plausibility checks (English keys, translated on render).
     * @param {SightingSaveRequest} values
     * @return {string[]}
     */
    protected static _hints(values: SightingSaveRequest): string[] {
        const hints: string[] = [];
        const tourStart = SightingEditModal._minutes(values.tour_start ?? '');
        const tourEnd = SightingEditModal._minutes(values.tour_end ?? '');
        const from = SightingEditModal._minutes(values.duration_from ?? '');
        const until = SightingEditModal._minutes(values.duration_until ?? '');

        if (values.date > moment().format('YYYY-MM-DD')) {
            hints.push('The date is in the future.');
        }

        if (tourStart !== null && tourEnd !== null && tourEnd < tourStart) {
            hints.push('The trip ends before it starts.');
        }

        if (from !== null && until !== null) {
            if (until < from) {
                hints.push('The sighting ends before it starts.');
            } else if (until - from > SightingEditModal._LONG_SIGHTING_MIN) {
                hints.push('The sighting lasts more than 3 hours.');
            }
        }

        if (from !== null && tourStart !== null && from < tourStart) {
            hints.push('The sighting starts before the trip start.');
        }

        if (from !== null && tourEnd !== null && tourStart !== null && tourEnd >= tourStart && from > tourEnd) {
            hints.push('The sighting starts after the trip end.');
        }

        if (values.species_count === 1) {
            if ([values.juveniles, values.calves, values.newborns].includes(1)) {
                hints.push('Calves, juveniles or newborns are marked, but the number of animals is 1.');
            }

            if (values.subgroups === 1) {
                hints.push('Subgroups are marked, but the number of animals is 1.');
            }
        }

        return hints;
    }

    protected _renderHints(hints: string[]): void {
        this._checks.empty().toggleClass('d-none', hints.length === 0);

        for (const hint of hints) {
            const line = jQuery('<div/>').appendTo(this._checks);
            jQuery('<i class="fas fa-exclamation-triangle"/>').appendTo(line);
            jQuery('<span/>').text(Lang.i().l(hint)).appendTo(line);
        }
    }

}