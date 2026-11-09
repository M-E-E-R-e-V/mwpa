/* global JQuery */
import moment from 'moment';
import {SightingHistoryEntry, Sightings as SightingsAPI} from '../../Api/Sightings';
import {Lang} from '../../Lang';

/**
 * Turns a stored value of a field into display text ('' = empty).
 */
export type SightingHistoryFormatter = (field: string, value: string) => string;

/**
 * SightingHistoryView
 *
 * "History" tab of the sighting dialog: one block per save (who, when,
 * web / app, created / changed / deleted) with the changed fields as
 * old → new. Loaded on demand when the tab opens.
 */
export class SightingHistoryView {

    /**
     * Labels of the tracked fields (English source text).
     */
    protected static readonly _LABELS: Record<string, string> = {
        vehicle_id: 'Boat',
        vehicle_driver_id: 'Skipper',
        beaufort_wind_n: 'Wind/Seastate (Beaufort)',
        date: 'Date',
        tour_id: 'Tour',
        tour_start: 'Start of trip',
        tour_end: 'End of trip',
        duration_from: 'Sighting from',
        duration_until: 'Sighting until',
        location_begin: 'Position begin',
        location_end: 'Position end',
        species_id: 'Species',
        species_count: 'Number of animals',
        reaction_id: 'Reaction',
        photo_taken: 'Photos taken',
        distance_coast: 'Distance to coast',
        distance_coast_estimation_gps: 'Distance to coast estimated without GPS',
        juveniles: 'Juveniles',
        calves: 'Calves',
        newborns: 'Newborns',
        subgroups: 'Subgroups',
        group_structure_id: 'Group structure',
        behaviours: 'Behaviour',
        freq_behaviour: 'Frequent behaviours of individuals',
        recognizable_animals: 'Recognizable animals',
        other_species: 'Other species',
        other: 'Other',
        other_vehicle: 'Other boats present',
        note: 'Note',
        sighting_type: 'Sighting type',
        deleted: 'Deleted',
        deletedDescription: 'Reason for deletion'
    };

    protected _element: JQuery;

    protected _format: SightingHistoryFormatter;

    protected _loadedId: number | null = null;

    protected _onCount: (count: number) => void;

    /**
     * constructor
     * @param {JQuery} parent
     * @param {SightingHistoryFormatter} format
     * @param {(count: number) => void} onCount number of saves, for the tab label
     */
    public constructor(parent: JQuery, format: SightingHistoryFormatter, onCount: (count: number) => void) {
        this._element = jQuery('<div class="mwpa-history"/>').appendTo(parent);
        this._format = format;
        this._onCount = onCount;
    }

    /**
     * Forget the loaded sighting (dialog reset).
     */
    public clear(): void {
        this._loadedId = null;
        this._element.empty();
        this._onCount(0);
    }

    /**
     * Load and render the history of a sighting (once per opened sighting).
     * @param {number} sightingId
     */
    public async load(sightingId: number): Promise<void> {
        if (this._loadedId === sightingId) {
            return;
        }

        this._loadedId = sightingId;
        this._element.empty();
        jQuery('<div class="text-body-secondary small py-3"/>')
        .append('<i class="fas fa-spinner fa-spin me-2"/>')
        .append(jQuery('<span/>').text(Lang.i().l('Loading …')))
        .appendTo(this._element);

        try {
            const list = await SightingsAPI.getHistory(sightingId);

            if (this._loadedId === sightingId) {
                this._render(list);
            }
        } catch (e) {
            this._loadedId = null;
            this._element.empty();
            jQuery('<div class="alert alert-danger py-2 small mb-0"/>')
            .text(`${Lang.i().l('History could not be loaded')}: ${(e as Error).message}`)
            .appendTo(this._element);
        }
    }

    /**
     * One block per change group, newest first.
     * @param {SightingHistoryEntry[]} list
     */
    protected _render(list: SightingHistoryEntry[]): void {
        const lang = Lang.i();
        this._element.empty();

        const groups: SightingHistoryEntry[][] = [];
        const byGroup = new Map<string, SightingHistoryEntry[]>();

        for (const entry of list) {
            const key = entry.change_group || `#${entry.id}`;
            let group = byGroup.get(key);

            if (!group) {
                group = [];
                byGroup.set(key, group);
                groups.push(group);
            }

            group.push(entry);
        }

        /*
         * Drop fields whose shown value didn't change (re-serialised JSON of
         * older saves) and saves that are empty after that.
         */
        const visible = groups
        .map((group) => group.filter((entry) => entry.field === '' || this._text(entry.field, entry.old_value) !== this._text(entry.field, entry.new_value)))
        .filter((group) => group.length > 0 && (group[0].action !== 'update' || group.some((entry) => entry.field !== '')));

        this._onCount(visible.length);

        if (visible.length === 0) {
            const empty = jQuery('<div class="text-center text-body-secondary py-4"/>').appendTo(this._element);
            jQuery('<i class="fas fa-history fa-2x mb-2 d-block opacity-50"/>').appendTo(empty);
            jQuery('<div/>').text(lang.l('No changes recorded yet.')).appendTo(empty);
            jQuery('<div class="small"/>').text(lang.l('Changes are recorded from now on with every save.')).appendTo(empty);
            return;
        }

        const timeline = jQuery('<ol class="mwpa-history-list list-unstyled mb-0"/>').appendTo(this._element);

        for (const group of visible) {
            this._renderGroup(timeline, group);
        }
    }

    /**
     * Block of one save.
     * @param {JQuery} parent
     * @param {SightingHistoryEntry[]} group
     */
    protected _renderGroup(parent: JQuery, group: SightingHistoryEntry[]): void {
        const lang = Lang.i();
        const first = group[0];
        const item = jQuery('<li class="mwpa-history-item"/>').attr('data-action', first.action).appendTo(parent);

        let icon = 'fas fa-pen';
        let title = 'changed';

        if (first.action === 'create') {
            icon = 'fas fa-plus';
            title = 'created';
        } else if (first.action === 'delete') {
            icon = 'fas fa-trash-alt';
            title = 'deleted';
        }

        jQuery('<span class="mwpa-history-dot"/>').append(jQuery('<i/>').addClass(icon)).appendTo(item);

        const head = jQuery('<div class="mwpa-history-head"/>').appendTo(item);
        jQuery('<span class="fw-semibold"/>')
        .text(first.changer_name === '' ? `${lang.l('User')} #${first.changer_id}` : first.changer_name)
        .appendTo(head);
        jQuery('<span class="text-body-secondary"/>').text(lang.l(title)).appendTo(head);

        const time = moment(first.change_time * 1000);
        jQuery('<span class="text-body-secondary small ms-auto text-nowrap"/>')
        .text(time.format('DD.MM.YYYY HH:mm'))
        .attr('title', time.format('DD.MM.YYYY HH:mm:ss'))
        .appendTo(head);

        const source = first.source === 'mobile' ? 'App' : 'Web';
        jQuery('<span class="badge rounded-pill border fw-normal text-body-secondary bg-body-tertiary"/>')
        .append(jQuery('<i class="me-1"/>').addClass(first.source === 'mobile' ? 'fas fa-mobile-alt' : 'fas fa-globe'))
        .append(jQuery('<span/>').text(source))
        .appendTo(head);

        const fields = group.filter((entry) => entry.field !== '');

        if (fields.length === 0) {
            return;
        }

        const table = jQuery('<table class="table table-sm mwpa-history-table mb-0"/>').appendTo(item);
        const body = jQuery('<tbody/>').appendTo(table);

        for (const entry of fields) {
            const tr = jQuery('<tr/>').appendTo(body);
            jQuery('<th scope="row" class="fw-normal text-body-secondary"/>')
            .text(lang.l(SightingHistoryView._LABELS[entry.field] ?? entry.field))
            .appendTo(tr);

            const td = jQuery('<td/>').appendTo(tr);
            this._value(td, entry.field, entry.old_value).addClass('mwpa-history-old');
            jQuery('<i class="fas fa-arrow-right mx-2 text-body-tertiary small"/>').appendTo(td);
            this._value(td, entry.field, entry.new_value).addClass('mwpa-history-new');
        }
    }

    /**
     * Display text of a value ('' = empty).
     * @param {string} field
     * @param {string} value
     * @return {string}
     */
    protected _text(field: string, value: string): string {
        return value === '' ? '' : this._format(field, value);
    }

    /**
     * Formatted value, "empty" in grey.
     * @param {JQuery} parent
     * @param {string} field
     * @param {string} value
     * @return {JQuery}
     */
    protected _value(parent: JQuery, field: string, value: string): JQuery {
        const text = this._text(field, value);
        const span = jQuery('<span/>').appendTo(parent);

        if (text === '') {
            span.addClass('fst-italic text-body-tertiary').text(Lang.i().l('empty'));
        } else {
            span.text(text);
        }

        return span;
    }

}