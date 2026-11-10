/* global JQuery */
import moment from 'moment';
import {SightingDetailsGroup, SightingDetailsSection, Sightings as SightingsAPI} from '../../Api/Sightings';
import {Lang} from '../../Lang';

/**
 * SightingDetailsView
 *
 * Read-only "Computed" tab of the sighting dialog: sub tabs (meta,
 * weather, sea, astro & tide, fishing & human, movement, earthquakes),
 * each with the value blocks of one source, its status and last update.
 * Loaded on demand when the tab opens.
 */
export class SightingDetailsView {

    /**
     * Status of a background service → pill (English label, tone).
     */
    protected static readonly _STATUS: Record<string, [string, string]> = {
        'ok': ['Computed', 'success'],
        '': ['Not computed yet', 'secondary'],
        'pending': ['Pending', 'secondary'],
        'no_data': ['No data', 'warning'],
        'no_provider': ['No data source', 'secondary'],
        'land': ['On land', 'warning'],
        'invalid_location': ['No valid position', 'danger'],
        'invalid_date': ['No valid date', 'danger'],
        'error': ['Error', 'danger']
    };

    protected static readonly _ICONS: Record<string, string> = {
        meta: 'fas fa-info-circle',
        weather: 'fas fa-cloud-sun',
        sea: 'fas fa-water',
        astro: 'fas fa-moon',
        human: 'fas fa-ship',
        movement: 'fas fa-route',
        seismic: 'fas fa-wave-square'
    };

    protected _element: JQuery;

    protected _loadedId: number | null = null;

    protected _activeKey: string = 'meta';

    /**
     * constructor
     * @param {JQuery} parent
     */
    public constructor(parent: JQuery) {
        this._element = jQuery('<div class="mwpa-details"/>').appendTo(parent);
    }

    /**
     * Forget the loaded sighting (dialog reset).
     */
    public clear(): void {
        this._loadedId = null;
        this._element.empty();
    }

    /**
     * Load and render the computed data of a sighting (once per opened sighting).
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
            const sections = await SightingsAPI.getDetails(sightingId);

            if (this._loadedId === sightingId) {
                this._render(sections);
            }
        } catch (e) {
            this._loadedId = null;
            this._element.empty();
            jQuery('<div class="alert alert-danger py-2 small mb-0"/>')
            .text(`${Lang.i().l('Data could not be loaded')}: ${(e as Error).message}`)
            .appendTo(this._element);
        }
    }

    /**
     * Sub tabs + panes.
     * @param {SightingDetailsSection[]} sections
     */
    protected _render(sections: SightingDetailsSection[]): void {
        const lang = Lang.i();
        this._element.empty();

        const nav = jQuery('<ul class="nav nav-pills nav-sm mwpa-details-nav"/>').appendTo(this._element);
        const panes: JQuery[] = [];

        if (!sections.some((section) => section.key === this._activeKey)) {
            this._activeKey = sections[0]?.key ?? '';
        }

        const show = (key: string): void => {
            this._activeKey = key;
            nav.find('.nav-link').each((_i, el) => {
                jQuery(el).toggleClass('active', jQuery(el).attr('data-key') === key);
            });
            panes.forEach((pane) => {
                pane.toggleClass('d-none', pane.attr('data-key') !== key);
            });
        };

        for (const section of sections) {
            const filled = section.groups.some((group) => group.items.some((item) => item.values.some((v) => v !== '')));
            const link = jQuery('<button type="button" class="nav-link"/>')
            .attr('data-key', section.key)
            .appendTo(jQuery('<li class="nav-item"/>').appendTo(nav));
            jQuery('<i class="me-1"/>').addClass(SightingDetailsView._ICONS[section.key] ?? 'fas fa-circle').appendTo(link);
            jQuery('<span/>').text(lang.l(section.title)).appendTo(link);

            if (!filled) {
                link.addClass('mwpa-details-empty');
            }

            link.on('click', (): void => show(section.key));

            const pane = jQuery('<div class="mwpa-details-pane"/>').attr('data-key', section.key).appendTo(this._element);
            panes.push(pane);

            for (const group of section.groups) {
                this._renderGroup(pane, group);
            }
        }

        show(this._activeKey);
    }

    /**
     * Value block of one source.
     * @param {JQuery} parent
     * @param {SightingDetailsGroup} group
     */
    protected _renderGroup(parent: JQuery, group: SightingDetailsGroup): void {
        const lang = Lang.i();
        const box = jQuery('<div class="mwpa-details-group"/>').appendTo(parent);
        const head = jQuery('<div class="mwpa-details-head"/>').appendTo(box);

        jQuery('<span class="fw-semibold"/>').text(group.title_raw ? group.title : lang.l(group.title)).appendTo(head);

        const [statusLabel, tone] = SightingDetailsView._STATUS[group.status] ?? [group.status, 'secondary'];
        jQuery('<span class="badge rounded-pill border fw-normal"/>')
        .addClass(`text-${tone}-emphasis bg-${tone}-subtle border-${tone}-subtle`)
        .text(lang.l(statusLabel))
        .appendTo(head);

        if (group.updated > 0) {
            jQuery('<span class="small text-body-secondary ms-auto text-nowrap"/>')
            .text(`${lang.l('as of')} ${moment(group.updated * 1000).format('DD.MM.YYYY HH:mm')}`)
            .appendTo(head);
        }

        if (group.items.length === 0) {
            jQuery('<div class="small text-body-tertiary px-2 py-2"/>').text(lang.l('No entries.')).appendTo(box);
            return;
        }

        const table = jQuery('<table class="table table-sm mwpa-details-table mb-0"/>').appendTo(box);

        if (group.columns.length > 0) {
            const tr = jQuery('<tr/>').appendTo(jQuery('<thead/>').appendTo(table));
            jQuery('<th/>').appendTo(tr);

            for (const column of group.columns) {
                jQuery('<th class="text-end fw-normal text-body-secondary small"/>').text(lang.l(column)).appendTo(tr);
            }
        }

        const body = jQuery('<tbody/>').appendTo(table);

        for (const item of group.items) {
            const tr = jQuery('<tr/>').appendTo(body);
            jQuery('<th scope="row" class="fw-normal text-body-secondary"/>').text(lang.l(item.label)).appendTo(tr);

            for (const value of item.values) {
                const td = jQuery('<td/>').toggleClass('text-end', group.columns.length > 0).appendTo(tr);
                this._value(td, value, item.unit, item.translate);
            }
        }
    }

    /**
     * One formatted value; '—' when empty.
     * @param {JQuery} td
     * @param {string} value
     * @param {string} unit
     * @param {boolean} translate
     */
    protected _value(td: JQuery, value: string, unit: string, translate: boolean): void {
        if (value === '') {
            jQuery('<span class="text-body-tertiary"/>').text('—').appendTo(td);
            return;
        }

        if (unit === 'unix') {
            const seconds = parseInt(value, 10);
            td.text(seconds > 0 ? moment(seconds * 1000).format('DD.MM.YYYY HH:mm') : '—');
            return;
        }

        jQuery('<span class="fw-semibold"/>').text(translate ? Lang.i().l(value) : value).appendTo(td);

        if (unit !== '') {
            jQuery('<span class="text-body-secondary small ms-1"/>').text(Lang.i().l(unit)).appendTo(td);
        }
    }

}