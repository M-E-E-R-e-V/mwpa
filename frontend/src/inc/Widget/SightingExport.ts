/* global JQuery */
import {Component2} from 'bambooo';
import {OfficeReport as OfficeReportApi, UsedVehiclesFilter} from '../Api/OfficeReport';
import {Organization as OrganizationApi} from '../Api/Organization';
import {Sightings as SightingsApi} from '../Api/Sightings';
import {Lang} from '../Lang';
import {Session} from '../Session';
import {AdminListUi} from './AdminListUi';

/**
 * One export column (key as the backend's Excel route expects it).
 */
type ExportColumn = {key: string; label: string;};

/**
 * Thematic group of columns in the picker.
 */
type ExportColumnGroup = {id: string; title: string; icon: string; optional: boolean; columns: ExportColumn[];};

type CoordFormat = 'decimal' | 'dms' | 'dm' | 'all';

type ExportKind = 'excel' | 'aroc' | 'datapage';

/**
 * Snapshot of the filter currently applied to the Sighting list. The keys
 * match the `SightingsFilter` schema so they can be forwarded to the export
 * backend 1:1 as query parameters; empty strings / 0 are treated as "no
 * filter" and dropped before the request goes out.
 */
export type SightingExportFilterSnapshot = {
    period_from: string;
    period_to: string;
    species_id: number;
    organization_id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    search: string;
};

/** Read the current filter from the page when the user clicks Download. */
export type SightingExportFilterProvider = () => SightingExportFilterSnapshot;

/**
 * Human-readable view of the page's filter for the export summary.
 */
export type SightingExportSummary = {
    filters: string[];
    count: number;
    includeOld: boolean;
};

export type SightingExportSummaryProvider = () => SightingExportSummary;

/**
 * Page-supplied callback that runs on "Generate PDF" — the page knows where
 * the Map / Analytics / Year-comparison panes live, how to make them render,
 * and how to invoke `window.print()` with the right print-mode classes.
 * The widget only fires the click; the page does the orchestration.
 */
export type SightingExportPdfHandler = () => void | Promise<void>;

/**
 * SightingExport
 *
 * Export tab of the sighting page. Three exports, picked via tiles (each
 * rights-gated like the backend routes; the backend still enforces them):
 *  - Excel export: all sightings of the current filter, with a grouped
 *    column picker (presets, remembered per browser) and coordinate format,
 *  - authority report: the AROC template (one file per boat and half-year),
 *  - data sheet: map + analytics + year comparison via the print dialog.
 */
export class SightingExport extends Component2 {

    protected static readonly _STORAGE_KEY = 'mwpa.sightingExport.v1';

    protected static readonly _GROUPS: ExportColumnGroup[] = [
        {
            id: 'trip',
            title: 'Trip',
            icon: 'fas fa-ship',
            optional: false,
            columns: [
                {key: 'id', label: 'Id'},
                {key: 'date', label: 'Date'},
                {key: 'tour_start', label: 'Start of trip'},
                {key: 'tour_end', label: 'End of trip'},
                {key: 'boat', label: 'Boat'},
                {key: 'skipper', label: 'Skipper'},
                {key: 'observer', label: 'Observer'},
                {key: 'beaufort', label: 'Wind/Seastate (Beaufort)'}
            ]
        },
        {
            id: 'sighting',
            title: 'Sighting',
            icon: 'fas fa-binoculars',
            optional: false,
            columns: [
                {key: 'species', label: 'Species'},
                {key: 'animal_count', label: 'Number of animals'},
                {key: 'duration_from', label: 'Duration from'},
                {key: 'duration_until', label: 'Duration until'},
                {key: 'distance_estimation', label: 'Estimation without GPS'},
                {key: 'distance_coast', label: 'Distance to nearst coast (nm)'}
            ]
        },
        {
            id: 'group',
            title: 'Group',
            icon: 'fas fa-users',
            optional: false,
            columns: [
                {key: 'juveniles', label: 'Juveniles'},
                {key: 'calves', label: 'Calves'},
                {key: 'newborns', label: 'Newborns'},
                {key: 'group_structure', label: 'Group structure'},
                {key: 'subgroups', label: 'Subgroups'},
                {key: 'recognizable_animals', label: 'Recognizable animals'}
            ]
        },
        {
            id: 'behaviour',
            title: 'Behaviour',
            icon: 'fas fa-swimmer',
            optional: false,
            columns: [
                {key: 'behaviour', label: 'Behaviour'},
                {key: 'reaction', label: 'Reaction'},
                {key: 'freq_behaviour', label: 'Frequent behaviours of individuals'}
            ]
        },
        {
            id: 'more',
            title: 'Further details',
            icon: 'far fa-sticky-note',
            optional: false,
            columns: [
                {key: 'photo_taken', label: 'Photos taken'},
                {key: 'other_species', label: 'Other species'},
                {key: 'other', label: 'Other'},
                {key: 'other_vehicle', label: 'Other boats present'},
                {key: 'note', label: 'Note'}
            ]
        },
        {
            id: 'meta',
            title: 'Sighting metadata',
            icon: 'fas fa-database',
            optional: true,
            columns: [
                {key: 'unid', label: 'UUID'},
                {key: 'sighting_type', label: 'Sighting type'},
                {key: 'organization', label: 'Organization'},
                {key: 'create_datetime', label: 'Created at'},
                {key: 'update_datetime', label: 'Updated at'},
                {key: 'tour_fid', label: 'Tour FID'}
            ]
        },
        {
            id: 'depth',
            title: 'Sea depth',
            icon: 'fas fa-water',
            optional: true,
            columns: [
                {key: 'depth_m', label: 'Sea depth (m)'},
                {key: 'depth_provider', label: 'Depth provider'}
            ]
        },
        {
            id: 'weather_day',
            title: 'Weather (day mean)',
            icon: 'fas fa-cloud-sun',
            optional: true,
            columns: [
                {key: 'sst_c_day', label: 'Sea-surface temperature (Day mean, °C)'},
                {key: 'air_temperature_c_day', label: 'Air temperature (Day mean, °C)'},
                {key: 'uv_index_day', label: 'UV index (Day max)'},
                {key: 'wave_height_m_day', label: 'Wave height (Day mean, m)'},
                {key: 'wave_period_s_day', label: 'Wave period (Day mean, s)'},
                {key: 'wave_direction_deg_day', label: 'Wave direction (Day mean, °)'}
            ]
        },
        {
            id: 'weather_hour',
            title: 'Weather (at sighting hour)',
            icon: 'far fa-clock',
            optional: true,
            columns: [
                {key: 'sst_c_hour', label: 'Sea-surface temperature (At hour, °C)'},
                {key: 'air_temperature_c_hour', label: 'Air temperature (At hour, °C)'},
                {key: 'uv_index_hour', label: 'UV index (At hour)'},
                {key: 'wave_height_m_hour', label: 'Wave height (At hour, m)'},
                {key: 'wave_period_s_hour', label: 'Wave period (At hour, s)'},
                {key: 'wave_direction_deg_hour', label: 'Wave direction (At hour, °)'}
            ]
        }
    ];

    protected static readonly _MINIMAL = ['id', 'date', 'boat', 'species', 'animal_count', 'duration_from'];

    protected static readonly _COORD_FORMATS: {value: CoordFormat; label: string; example: string;}[] = [
        {value: 'decimal', label: 'Decimal degrees', example: '28.12345, -16.45678'},
        {value: 'dm', label: 'Degrees, decimal minutes', example: '28° 07.407′ N'},
        {value: 'dms', label: 'Degrees, minutes, seconds', example: '28° 07′ 24″ N'},
        {value: 'all', label: 'All formats', example: 'one column per format'}
    ];

    protected _filterProvider: SightingExportFilterProvider | null = null;

    protected _summaryProvider: SightingExportSummaryProvider | null = null;

    protected _pdfHandler: SightingExportPdfHandler | null = null;

    protected _selected: Set<string>;

    protected _coordFormat: CoordFormat = 'decimal';

    protected _choicesEl: JQuery;

    protected _panels: Map<ExportKind, JQuery> = new Map<ExportKind, JQuery>();

    protected _summaryEls: JQuery[] = [];

    protected _columnsEl: JQuery | null = null;

    protected _columnCountEl: JQuery | null = null;

    public constructor(
        parent: JQuery,
        filterProvider?: SightingExportFilterProvider,
        pdfHandler?: SightingExportPdfHandler
    ) {
        const root = jQuery<HTMLDivElement>('<div class="sighting-export p-3"/>').appendTo(parent);
        super({element: root});

        this._filterProvider = filterProvider ?? null;
        this._pdfHandler = pdfHandler ?? null;
        this._selected = SightingExport._defaultSelection();
        this._loadSettings();

        this._choicesEl = jQuery('<div class="mwpa-export-choices mb-3"/>').appendTo(root);

        /*
         * Server exports are rights-gated like their routes; the data sheet
         * is a client-side print and always available. The backend still
         * enforces every export route (403) — hiding is a UX nicety.
         */
        const kinds: ExportKind[] = [];

        if (Session.hasRight('export_xlsx')) {
            kinds.push('excel');
            this._buildExcel(this._panel('excel'));
        }

        if (Session.hasRight('export_aroc')) {
            kinds.push('aroc');
            this._buildAroc(this._panel('aroc'));
        }

        kinds.push('datapage');
        this._buildDataPage(this._panel('datapage'));

        for (const kind of kinds) {
            this._choice(kind);
        }

        this._select(kinds[0]);
    }

    /**
     * Readable filter summary shown next to the exports.
     * @param {SightingExportSummaryProvider} provider
     */
    public setSummaryProvider(provider: SightingExportSummaryProvider): void {
        this._summaryProvider = provider;
        this.refresh();
    }

    /**
     * Re-read the page's filter (call when the filter or the count changed).
     */
    public refresh(): void {
        const lang = Lang.i();
        const summary = this._summaryProvider?.() ?? null;

        for (const el of this._summaryEls) {
            el.empty();

            if (summary) {
                SightingExport._renderSummary(el, summary);
            } else {
                jQuery('<div class="small text-body-secondary"/>').text(lang.l('Current list filter')).appendTo(el);
            }
        }
    }

    /**
     * Count, filter pills and the old-data note of one summary block.
     * @param {JQuery} el
     * @param {SightingExportSummary} summary
     * @protected
     */
    protected static _renderSummary(el: JQuery, summary: SightingExportSummary): void {
        const lang = Lang.i();

        const count = jQuery('<div class="d-flex align-items-baseline gap-2 mb-2"/>').appendTo(el);
        jQuery('<span class="fs-4 fw-semibold lh-1"/>').text(summary.count.toLocaleString()).appendTo(count);
        jQuery('<span class="text-body-secondary"/>').text(lang.l('Sightings')).appendTo(count);

        const filters = jQuery('<div class="d-flex flex-wrap gap-1"/>').appendTo(el);

        if (summary.filters.length === 0) {
            AdminListUi.pill(filters, 'No filter – all sightings', 'secondary', 'fas fa-globe');
        }

        for (const filter of summary.filters) {
            // filter values are data (names, dates), not translation keys
            AdminListUi.pill(filters, '', 'primary', 'fas fa-filter').find('span').last().text(filter);
        }

        if (summary.includeOld && el.closest('[data-export="excel"]').length > 0) {
            jQuery('<div class="small text-warning-emphasis mt-2"/>')
            .html(`<i class="fas fa-info-circle me-1"></i>${AdminListUi.escape(lang.l('Old (hand-entered) data is not part of the Excel export.'))}`)
            .appendTo(el);
        }
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Layout
     * ---------------------------------------------------------------------------------------------
     */

    protected _panel(kind: ExportKind): JQuery {
        const panel = jQuery('<div class="d-none"/>').attr('data-export', kind).appendTo(this._element);
        this._panels.set(kind, panel);
        return panel;
    }

    protected _choice(kind: ExportKind): void {
        const lang = Lang.i();
        const info: Record<ExportKind, [string, string, string, string]> = {
            excel: ['fas fa-file-excel', 'Excel export', 'All sightings of the current filter as a spreadsheet, columns selectable.', 'XLSX'],
            aroc: ['fas fa-landmark', 'Authority report', 'AROC template, one file per boat and half-year.', 'XLSX'],
            datapage: ['fas fa-file-pdf', 'Data sheet', 'Map, analytics and year comparison on printable pages.', 'PDF']
        };
        const [icon, title, text, format] = info[kind];

        const button = jQuery('<button type="button" class="mwpa-export-choice"/>')
        .attr('data-export', kind)
        .on('click', () => this._select(kind))
        .appendTo(this._choicesEl);

        jQuery('<span class="mwpa-export-choice-icon"/>').append(jQuery('<i/>').addClass(icon)).appendTo(button);
        const texts = jQuery('<span class="d-block text-start flex-grow-1"/>').appendTo(button);
        const head = jQuery('<span class="d-flex align-items-center gap-2"/>').appendTo(texts);
        jQuery('<span class="fw-semibold"/>').text(lang.l(title)).appendTo(head);
        jQuery('<span class="badge text-bg-light border ms-auto"/>').text(format).appendTo(head);
        jQuery('<span class="d-block small text-body-secondary mt-1"/>').text(lang.l(text)).appendTo(texts);
    }

    protected _select(kind: ExportKind): void {
        this._choicesEl.find('.mwpa-export-choice').each((_i, el) => {
            const active = jQuery(el).attr('data-export') === kind;
            jQuery(el).toggleClass('active', active).attr('aria-pressed', active ? 'true' : 'false');
        });

        for (const [panelKind, panel] of this._panels) {
            panel.toggleClass('d-none', panelKind !== kind);
        }
    }

    /**
     * Side card: what gets exported + the action.
     * @param {JQuery} parent
     * @return {JQuery} body to add format controls and the button to
     * @protected
     */
    protected _summaryCard(parent: JQuery): JQuery {
        const lang = Lang.i();
        const card = jQuery('<div class="card mwpa-export-summary"/>').appendTo(parent);
        const body = jQuery('<div class="card-body"/>').appendTo(card);
        jQuery('<div class="small text-uppercase fw-semibold text-body-secondary mb-2"/>').text(lang.l('Scope')).appendTo(body);
        const summary = jQuery('<div class="mb-3"/>').appendTo(body);
        jQuery('<div class="small text-body-tertiary mb-3"/>')
        .text(lang.l('Change the filter above the tabs to narrow the export.'))
        .appendTo(body);
        this._summaryEls.push(summary);

        return body;
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Excel export
     * ---------------------------------------------------------------------------------------------
     */

    protected _buildExcel(panel: JQuery): void {
        const lang = Lang.i();
        const row = jQuery('<div class="row g-3"/>').appendTo(panel);
        const left = jQuery('<div class="col-xl-8"/>').appendTo(row);
        const right = jQuery('<div class="col-xl-4"/>').appendTo(row);

        // column picker
        const card = jQuery('<div class="card"/>').appendTo(left);
        const header = jQuery('<div class="card-header d-flex flex-wrap align-items-center gap-2"/>').appendTo(card);
        const titles = jQuery('<div class="me-auto"/>').appendTo(header);
        jQuery('<div class="fw-semibold"/>').text(lang.l('Columns')).appendTo(titles);
        this._columnCountEl = jQuery('<div class="small text-body-secondary"/>').appendTo(titles);

        const presets = jQuery('<div class="btn-group btn-group-sm" role="group"/>').appendTo(header);
        const presetDefs: [string, () => Set<string>][] = [
            ['Minimal', (): Set<string> => new Set(SightingExport._MINIMAL)],
            ['Standard', (): Set<string> => SightingExport._defaultSelection()],
            ['All', (): Set<string> => new Set(SightingExport._GROUPS.flatMap((group) => group.columns.map((column) => column.key)))]
        ];

        for (const [label, make] of presetDefs) {
            jQuery('<button type="button" class="btn btn-outline-secondary"/>')
            .text(lang.l(label))
            .on('click', () => {
                this._selected = make();
                this._syncColumns();
            })
            .appendTo(presets);
        }

        this._columnsEl = jQuery('<div class="card-body mwpa-export-groups"/>').appendTo(card);

        for (const group of SightingExport._GROUPS) {
            this._buildGroup(this._columnsEl, group);
        }

        // summary + format + download
        const body = this._summaryCard(right);
        jQuery('<div class="small text-uppercase fw-semibold text-body-secondary mb-2"/>').text(lang.l('Coordinate format')).appendTo(body);
        const formats = jQuery('<div class="list-group mb-3"/>').appendTo(body);
        const formatName = `mwpa-export-coord-${Date.now()}`;

        for (const format of SightingExport._COORD_FORMATS) {
            const item = jQuery('<label class="list-group-item d-flex gap-2 align-items-start"/>').appendTo(formats);
            jQuery('<input type="radio" class="form-check-input flex-shrink-0 mt-1"/>')
            .attr('name', formatName)
            .val(format.value)
            .prop('checked', format.value === this._coordFormat)
            .on('change', () => {
                this._coordFormat = format.value;
                this._saveSettings();
            })
            .appendTo(item);
            const text = jQuery('<span/>').appendTo(item);
            jQuery('<span class="d-block"/>').text(lang.l(format.label)).appendTo(text);
            jQuery('<span class="d-block small text-body-secondary font-monospace"/>').text(lang.l(format.example)).appendTo(text);
        }

        const button = jQuery('<button type="button" class="btn btn-primary w-100"/>')
        .html(`<i class="fas fa-file-download me-1"></i>${AdminListUi.escape(lang.l('Download Excel'))}`)
        .appendTo(body);
        const status = jQuery('<div class="mt-2"/>').appendTo(body);

        button.on('click', () => {
            if (this._selected.size === 0) {
                SightingExport._status(status, 'warning', lang.l('Pick at least one column.'));
                return;
            }

            const params = new URLSearchParams();
            const keys = SightingExport._GROUPS.flatMap((group) => group.columns.map((column) => column.key))
            .filter((key) => this._selected.has(key));

            params.set('columns', keys.join(','));
            params.set('coord_format', this._coordFormat);
            this._appendFilter(params);

            SightingExport._download(`/json/sightings/list/excel?${params.toString()}`, 'sightings_list.xlsx', button, status)
            .catch(() => undefined);
        });

        this._syncColumns();
    }

    protected _buildGroup(parent: JQuery, group: ExportColumnGroup): void {
        const lang = Lang.i();
        const section = jQuery('<div class="mwpa-export-group"/>').attr('data-group', group.id).appendTo(parent);
        const head = jQuery('<label class="d-flex align-items-center gap-2 mb-2"/>').appendTo(section);
        const master = jQuery('<input type="checkbox" class="form-check-input mt-0 mwpa-export-master"/>').appendTo(head);
        jQuery('<i class="text-body-secondary small"/>').addClass(group.icon).appendTo(head);
        jQuery('<span class="fw-semibold small text-uppercase"/>').text(lang.l(group.title)).appendTo(head);

        if (group.optional) {
            AdminListUi.pill(head, 'optional', 'secondary');
        }

        jQuery('<span class="small text-body-tertiary ms-auto mwpa-export-group-count"/>').appendTo(head);

        master.on('change', () => {
            const checked = master.prop('checked') === true;

            for (const column of group.columns) {
                if (checked) {
                    this._selected.add(column.key);
                } else {
                    this._selected.delete(column.key);
                }
            }

            this._syncColumns();
        });

        const grid = jQuery('<div class="row g-1"/>').appendTo(section);

        for (const column of group.columns) {
            const col = jQuery('<div class="col-md-6 col-xxl-4"/>').appendTo(grid);
            const item = jQuery('<label class="mwpa-export-column"/>').appendTo(col);
            jQuery('<input type="checkbox" class="form-check-input mt-0"/>')
            .attr('data-key', column.key)
            .on('change', (event) => {
                if (jQuery(event.currentTarget).prop('checked') === true) {
                    this._selected.add(column.key);
                } else {
                    this._selected.delete(column.key);
                }

                this._syncColumns();
            })
            .appendTo(item);
            jQuery('<span/>').text(lang.l(column.label)).appendTo(item);
        }
    }

    /**
     * Reflect `_selected` in the checkboxes, group masters and counters.
     * @protected
     */
    protected _syncColumns(): void {
        if (!this._columnsEl) {
            return;
        }

        const lang = Lang.i();
        let total = 0;

        for (const group of SightingExport._GROUPS) {
            const section = this._columnsEl.find(`[data-group="${group.id}"]`);
            const picked = group.columns.filter((column) => this._selected.has(column.key)).length;
            total += group.columns.length;

            section.find('input[data-key]').each((_i, el) => {
                jQuery(el).prop('checked', this._selected.has(`${jQuery(el).attr('data-key')}`));
            });

            section.find('.mwpa-export-master')
            .prop('checked', picked === group.columns.length)
            .prop('indeterminate', picked > 0 && picked < group.columns.length);
            section.find('.mwpa-export-group-count').text(`${picked} / ${group.columns.length}`);
        }

        this._columnCountEl?.text(
            `${this._selected.size} ${lang.l('of')} ${total} ${lang.l('selected')} · ${lang.l('plus the position columns')}`
        );
        this._saveSettings();
    }

    protected _appendFilter(params: URLSearchParams): void {
        if (!this._filterProvider) {
            return;
        }

        const filter = this._filterProvider();

        if (filter.period_from !== '') {
            params.set('period_from', filter.period_from);
        }

        if (filter.period_to !== '') {
            params.set('period_to', filter.period_to);
        }

        const ids: [string, number][] = [
            ['species_id', filter.species_id],
            ['organization_id', filter.organization_id],
            ['vehicle_id', filter.vehicle_id],
            ['vehicle_driver_id', filter.vehicle_driver_id]
        ];

        for (const [name, value] of ids) {
            if (value > 0) {
                params.set(name, `${value}`);
            }
        }

        if (filter.search !== '') {
            params.set('search', filter.search);
        }
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * AROC report
     * ---------------------------------------------------------------------------------------------
     */

    protected _buildAroc(panel: JQuery): void {
        const lang = Lang.i();
        const card = jQuery('<div class="card"/>').appendTo(panel);
        const header = jQuery('<div class="card-header"/>').appendTo(card);
        jQuery('<div class="fw-semibold"/>').text(lang.l('AROC office report')).appendTo(header);
        jQuery('<div class="small text-body-secondary"/>')
        .text(lang.l('Fills the AROC template “datos SALIDAS”. The authority expects one file per boat and half-year.'))
        .appendTo(header);

        const body = jQuery('<div class="card-body"/>').appendTo(card);
        const form = jQuery('<div class="row g-3"/>').appendTo(body);

        const field = (cls: string, label: string, required: boolean = false): JQuery<HTMLSelectElement> => {
            const col = jQuery('<div/>').addClass(cls).appendTo(form);
            const lbl = jQuery('<label class="form-label small fw-semibold"/>').text(lang.l(label)).appendTo(col);

            if (required) {
                jQuery('<span class="text-danger ms-1"/>').text('*').appendTo(lbl);
            }

            return jQuery<HTMLSelectElement>('<select class="form-select" disabled/>')
            .append(jQuery('<option value=""/>').text(lang.l('Loading…')))
            .appendTo(col);
        };

        const yearSelect = field('col-md-3', 'Year');
        const semesterSelect = field('col-md-3', 'Semester');
        const organizationSelect = field('col-md-6', 'Organization');
        const vehicleSelect = field('col-md-6', 'Boat', true);
        const receiverSelect = field('col-md-6', 'External receiver');

        semesterSelect.empty().prop('disabled', false);
        SightingExport._options(semesterSelect, [
            ['', lang.l('Full year')],
            ['1', lang.l('1st semester (Jan–Jun)')],
            ['2', lang.l('2nd semester (Jul–Dec)')]
        ]);

        const footer = jQuery('<div class="card-footer d-flex flex-wrap align-items-center gap-2"/>').appendTo(card);
        const status = jQuery('<div class="me-auto small"/>').appendTo(footer);
        const button = jQuery('<button type="button" class="btn btn-primary" disabled/>')
        .html(`<i class="fas fa-file-download me-1"></i>${AdminListUi.escape(lang.l('Download report'))}`)
        .appendTo(footer);

        let receiversReady = false;

        const updateButton = (): void => {
            const vehicleId = parseInt(String(vehicleSelect.val() ?? ''), 10);
            const hasBoat = Number.isFinite(vehicleId) && vehicleId > 0;
            button.prop('disabled', !(receiversReady && hasBoat));

            if (!receiversReady) {
                SightingExport._status(status, 'secondary', lang.l('No receivers configured'));
            } else if (hasBoat) {
                status.empty();
            } else {
                SightingExport._status(status, 'secondary', lang.l('Pick a boat — AROC requires one file per boat.'));
            }
        };

        /*
         * Boats come from /json/officereport/used_vehicles for the picked
         * year/semester/organization. A sequence number drops stale answers
         * when the pickers change quickly; the picked boat stays when it is
         * still in the new list.
         */
        let vehicleSeq = 0;

        const refreshVehicles = (): void => {
            const current = String(vehicleSelect.val() ?? '');
            const seq = ++vehicleSeq;
            const filter: UsedVehiclesFilter = {};
            const year = parseInt(String(yearSelect.val() ?? ''), 10);
            const semester = String(semesterSelect.val() ?? '');
            const organization = parseInt(String(organizationSelect.val() ?? ''), 10);

            if (Number.isFinite(year) && year > 0) {
                filter.year = year;
            }

            if (semester === '1' || semester === '2') {
                filter.semester = semester === '1' ? 1 : 2;
            }

            if (Number.isFinite(organization) && organization > 0) {
                filter.organizationId = organization;
            }

            vehicleSelect.prop('disabled', true);

            const fill = (vehicles: {id: number; name: string;}[]): void => {
                if (seq !== vehicleSeq) {
                    return;
                }

                vehicleSelect.empty();
                SightingExport._options(vehicleSelect, [
                    ['', lang.l('— Select a boat —')],
                    ...vehicles.map((vehicle): [string, string] => [`${vehicle.id}`, vehicle.name])
                ]);
                vehicleSelect.val(vehicles.some((vehicle) => `${vehicle.id}` === current) ? current : '');
                vehicleSelect.prop('disabled', false);
                updateButton();
            };

            OfficeReportApi.getUsedVehicles(filter).then(fill).catch(() => fill([]));
        };

        SightingsApi.getYears().then((years) => {
            yearSelect.empty();
            SightingExport._options(yearSelect, [['', lang.l('All years')], ...years.map((year): [string, string] => [`${year}`, `${year}`])]);

            if (years.length > 0) {
                yearSelect.val(`${years[0]}`);
            }
        }).catch(() => {
            yearSelect.empty();
            SightingExport._options(yearSelect, [['', lang.l('All years')]]);
        }).finally(() => {
            yearSelect.prop('disabled', false);
            refreshVehicles();
        });

        OrganizationApi.getOrganizationByUser(true).then((organizations) => {
            organizationSelect.empty();
            SightingExport._options(organizationSelect, [
                ['', lang.l('All organizations')],
                ...(organizations ?? []).map((organization): [string, string] => [`${organization.id}`, organization.description])
            ]);
        }).catch(() => {
            organizationSelect.empty();
            SightingExport._options(organizationSelect, [['', lang.l('All organizations')]]);
        }).finally(() => {
            organizationSelect.prop('disabled', false);
        });

        OfficeReportApi.getReceivers().then((receivers) => {
            receiverSelect.empty();
            receiversReady = receivers.length > 0;

            if (receiversReady) {
                SightingExport._options(receiverSelect, receivers.map((receiver): [string, string] => [`${receiver.id}`, receiver.name]));
                receiverSelect.prop('disabled', false);
            } else {
                SightingExport._options(receiverSelect, [['', lang.l('No receivers configured')]]);
            }

            updateButton();
        }).catch(() => {
            receiverSelect.empty();
            SightingExport._options(receiverSelect, [['', lang.l('No receivers configured')]]);
            receiversReady = false;
            updateButton();
        });

        yearSelect.on('change', refreshVehicles);
        semesterSelect.on('change', refreshVehicles);
        organizationSelect.on('change', refreshVehicles);
        vehicleSelect.on('change', updateButton);

        button.on('click', () => {
            const params = new URLSearchParams();
            const year = String(yearSelect.val() ?? '').trim();
            const semester = String(semesterSelect.val() ?? '').trim();
            const vehicleId = parseInt(String(vehicleSelect.val() ?? ''), 10);
            const receiverId = parseInt(String(receiverSelect.val() ?? ''), 10);

            if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
                SightingExport._status(status, 'warning', lang.l('Pick a boat — AROC requires one file per boat.'));
                return;
            }

            if (year !== '') {
                params.set('year', year);
            }

            if (semester === '1' || semester === '2') {
                params.set('semester', semester);
            }

            params.set('vehicle_id', `${vehicleId}`);

            if (Number.isFinite(receiverId) && receiverId > 0) {
                params.set('external_receiver_id', `${receiverId}`);
            }

            SightingExport._download(`/json/officereport/create_export?${params.toString()}`, 'AROC.xlsx', button, status)
            .catch(() => undefined);
        });
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Data sheet (print)
     * ---------------------------------------------------------------------------------------------
     */

    protected _buildDataPage(panel: JQuery): void {
        const lang = Lang.i();
        const row = jQuery('<div class="row g-3"/>').appendTo(panel);
        const left = jQuery('<div class="col-xl-8"/>').appendTo(row);
        const right = jQuery('<div class="col-xl-4"/>').appendTo(row);

        const card = jQuery('<div class="card"/>').appendTo(left);
        const header = jQuery('<div class="card-header"/>').appendTo(card);
        jQuery('<div class="fw-semibold"/>').text(lang.l('Contents of the data sheet')).appendTo(header);
        jQuery('<div class="small text-body-secondary"/>')
        .text(lang.l('Built from the current list filter, ready for printing or saving as PDF.'))
        .appendTo(header);

        const list = jQuery('<div class="list-group list-group-flush"/>').appendTo(card);
        const parts: [string, string, string][] = [
            ['fas fa-map-marked-alt', 'Map', 'All sightings of the filter with the chosen layers.'],
            ['fas fa-chart-bar', 'Analytics', 'Key figures, species, season, time of day, group size, behaviour.'],
            ['fas fa-chart-line', 'Year comparison', 'Course of the years, table per year and calendar.']
        ];

        for (const [icon, title, text] of parts) {
            const item = jQuery('<div class="list-group-item d-flex gap-3 align-items-start"/>').appendTo(list);
            jQuery('<span class="mwpa-export-choice-icon small"/>').append(jQuery('<i/>').addClass(icon)).appendTo(item);
            const texts = jQuery('<div/>').appendTo(item);
            jQuery('<div class="fw-semibold"/>').text(lang.l(title)).appendTo(texts);
            jQuery('<div class="small text-body-secondary"/>').text(lang.l(text)).appendTo(texts);
        }

        const body = this._summaryCard(right);
        const button = jQuery('<button type="button" class="btn btn-primary w-100"/>')
        .html(`<i class="fas fa-print me-1"></i>${AdminListUi.escape(lang.l('Generate PDF'))}`)
        .appendTo(body);
        jQuery('<div class="small text-body-tertiary mt-2"/>')
        .text(lang.l('Opens the print dialog — choose “Save as PDF” there.'))
        .appendTo(body);
        const status = jQuery('<div class="mt-2"/>').appendTo(body);

        if (!this._pdfHandler) {
            button.prop('disabled', true);
            return;
        }

        const handler = this._pdfHandler;

        button.on('click', async() => {
            const label = button.html();
            button.prop('disabled', true).html(`<span class="spinner-border spinner-border-sm me-1"></span>${AdminListUi.escape(lang.l('Generating…'))}`);
            status.empty();

            try {
                await handler();
            } catch (e) {
                SightingExport._status(status, 'danger', `${lang.l('Download failed')}: ${(e as Error).message}`);
            } finally {
                button.html(label).prop('disabled', false);
            }
        });
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Helpers
     * ---------------------------------------------------------------------------------------------
     */

    protected _loadSettings(): void {
        try {
            const raw = window.localStorage.getItem(SightingExport._STORAGE_KEY);

            if (!raw) {
                return;
            }

            const data = JSON.parse(raw) as {columns?: unknown; coord?: unknown;};
            const known = new Set(SightingExport._GROUPS.flatMap((group) => group.columns.map((column) => column.key)));

            if (Array.isArray(data.columns)) {
                this._selected = new Set(data.columns.filter((key): key is string => typeof key === 'string' && known.has(key)));
            }

            if (SightingExport._COORD_FORMATS.some((format) => format.value === data.coord)) {
                this._coordFormat = data.coord as CoordFormat;
            }
        } catch {
            // storage unavailable or broken — keep the defaults
        }
    }

    protected _saveSettings(): void {
        try {
            window.localStorage.setItem(SightingExport._STORAGE_KEY, JSON.stringify({
                columns: [...this._selected],
                coord: this._coordFormat
            }));
        } catch {
            // storage unavailable — the choice just isn't remembered
        }
    }

    protected static _defaultSelection(): Set<string> {
        return new Set(SightingExport._GROUPS
        .filter((group) => !group.optional)
        .flatMap((group) => group.columns.map((column) => column.key)));
    }

    protected static _options(select: JQuery<HTMLSelectElement>, options: [string, string][]): void {
        for (const [value, label] of options) {
            jQuery('<option/>').val(value).text(label).appendTo(select);
        }
    }

    protected static _status(el: JQuery, tone: 'success' | 'warning' | 'danger' | 'secondary', text: string): void {
        const icons: Record<string, string> = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-times-circle',
            secondary: 'fas fa-info-circle'
        };

        el.empty();
        jQuery('<div class="small"/>')
        .addClass(tone === 'secondary' ? 'text-body-secondary' : `text-${tone}-emphasis`)
        .html(`<i class="${icons[tone]} me-1"></i>${AdminListUi.escape(text)}`)
        .appendTo(el);
    }

    /**
     * Download via fetch + blob (not an anchor to the URL): Chrome's
     * Safe-Browsing heuristics on self-signed certs sometimes swallow
     * programmatic anchor downloads of office files silently; this way
     * errors surface. The file name comes from Content-Disposition.
     * @param {string} url
     * @param {string} fallbackName
     * @param {JQuery} button
     * @param {JQuery} status
     * @protected
     */
    protected static async _download(url: string, fallbackName: string, button: JQuery, status: JQuery): Promise<void> {
        const lang = Lang.i();
        const label = button.html();
        let objectUrl: string | null = null;

        button.prop('disabled', true).html(`<span class="spinner-border spinner-border-sm me-1"></span>${AdminListUi.escape(lang.l('Generating…'))}`);
        SightingExport._status(status, 'secondary', lang.l('The file is being created, this can take a moment.'));

        try {
            const response = await fetch(url, {credentials: 'same-origin'});

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`${response.status} ${response.statusText} ${text}`.trim());
            }

            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') ?? '';
            const match = (/filename="([^"]+)"/u).exec(disposition);
            const name = match ? match[1] : fallbackName;

            objectUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            SightingExport._status(status, 'success', `${name} · ${(blob.size / 1024).toLocaleString(undefined, {maximumFractionDigits: 0})} KB`);
        } catch (e) {
            SightingExport._status(status, 'danger', `${lang.l('Download failed')}: ${(e as Error).message}`);
        } finally {
            if (objectUrl !== null) {
                URL.revokeObjectURL(objectUrl);
            }

            button.html(label).prop('disabled', false);
        }
    }

}