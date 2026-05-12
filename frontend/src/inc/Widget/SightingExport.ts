/* global JQuery */
import {Component, UtilDownload} from 'bambooo';
import {OfficeReport as OfficeReportApi, UsedVehiclesFilter} from '../Api/OfficeReport';
import {Organization as OrganizationApi} from '../Api/Organization';
import {Sightings as SightingsApi} from '../Api/Sightings';
import {Lang} from '../Lang';

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;');

type Column = {key: string; label: string;};
type ColumnGroup = {title: string; columns: Column[];};

/**
 * Standard columns — same set the backend's `Excel.HEADERS` array
 * emits today. Listed with stable `key`s so the picker can send
 * them via `columns=` and the backend can later opt-in/out per key.
 *
 * Position columns (lat/lon begin/end) intentionally stay out of this
 * list — they're driven by the coordinate-format selector.
 */
const STANDARD_COLUMNS: Column[] = [
    {key: 'id', label: 'Id'},
    {key: 'date', label: 'Date'},
    {key: 'tour_start', label: 'Start of trip'},
    {key: 'tour_end', label: 'End of trip'},
    {key: 'boat', label: 'Boat'},
    {key: 'skipper', label: 'Skipper'},
    {key: 'observer', label: 'Observer'},
    {key: 'beaufort', label: 'Wind/Seastate (Beaufort)'},
    {key: 'species', label: 'Species'},
    {key: 'animal_count', label: 'Number of animals'},
    {key: 'duration_from', label: 'Duration from'},
    {key: 'duration_until', label: 'Duration until'},
    {key: 'distance_estimation', label: 'Estimation without GPS'},
    {key: 'distance_coast', label: 'Distance to nearst coast (nm)'},
    {key: 'juveniles', label: 'Juveniles'},
    {key: 'calves', label: 'Calves'},
    {key: 'newborns', label: 'Newborns'},
    {key: 'behaviour', label: 'Behaviour'},
    {key: 'group_structure', label: 'Group structure'},
    {key: 'subgroups', label: 'Subgroups'},
    {key: 'reaction', label: 'Reaction'},
    {key: 'freq_behaviour', label: 'Frequent behaviours of individuals'},
    {key: 'photo_taken', label: 'Photos taken'},
    {key: 'recognizable_animals', label: 'Recognizable animals'},
    {key: 'other_species', label: 'Other species'},
    {key: 'other', label: 'Other'},
    {key: 'other_vehicle', label: 'Other boats present'},
    {key: 'note', label: 'Note'}
];

/**
 * Optional columns the user can opt into before downloading. Grouped
 * for readability. Backend currently ignores the pick — frontend ships
 * the keys via `columns=` so it's ready when the handler picks them up.
 */
const OPTIONAL_GROUPS: ColumnGroup[] = [
    {
        title: 'Sighting metadata',
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
        title: 'Sea depth',
        columns: [
            {key: 'depth_m', label: 'Sea depth (m)'},
            {key: 'depth_provider', label: 'Depth provider'}
        ]
    },
    {
        title: 'Weather (day mean)',
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
        title: 'Weather (at sighting hour)',
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

type CoordFormat = 'decimal' | 'dms' | 'dm' | 'all';

const COORD_FORMATS: {value: CoordFormat; label: string;}[] = [
    {value: 'decimal', label: 'Decimal degrees (e.g. 28.123, -16.456)'},
    {value: 'dms', label: 'DMS — Degrees Minutes Seconds (e.g. 28° 07′ 24″ N)'},
    {value: 'dm', label: 'DM — Degrees Decimal Minutes (e.g. 28° 07.41′ N)'},
    {value: 'all', label: 'All formats (extra columns per position)'}
];

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
 * Page-supplied callback that runs on "Generate PDF" — the page knows where
 * the Map / Analytics / Year-comparison panes live, how to make them render,
 * and how to invoke `window.print()` with the right print-mode classes.
 * The widget only fires the click; the page does the orchestration.
 */
export type SightingExportPdfHandler = () => void | Promise<void>;

/**
 * Export tab on the Sighting page. Offers three sub-tabs:
 *
 *   - **Excel Export** — full sightings spreadsheet, with column
 *     picker (standard + optional all toggleable) and coordinate
 *     format selector
 *   - **Excel Report** — filled AROC template (one file per boat per
 *     half-year)
 *   - **Data Page**    — single printable data sheet (Map + Analytics +
 *     Year comparison) — uses the browser's "Save as PDF" via window.print()
 */
export class SightingExport extends Component<HTMLDivElement> {

    protected _excelExportBody: JQuery;

    protected _excelReportBody: JQuery;

    protected _dataPageBody: JQuery;

    /**
     * Optional snapshot provider supplied by the page that hosts this widget.
     * When set, the Download button reads the current filter on click and
     * appends every non-empty value as a query parameter so the server-side
     * export sees exactly what's listed in the table above. Without it, the
     * backend falls back to its old behaviour and exports all sightings.
     */
    protected _filterProvider: SightingExportFilterProvider|null = null;

    /**
     * Page-supplied PDF orchestrator. The widget can't do this itself — making
     * the OpenLayers map render off-screen and triggering D3 redraws lives on
     * the page that owns those widgets.
     */
    protected _pdfHandler: SightingExportPdfHandler|null = null;

    public constructor(
        parent: JQuery,
        filterProvider?: SightingExportFilterProvider,
        pdfHandler?: SightingExportPdfHandler
    ) {
        const root = jQuery<HTMLDivElement>('<div class="sighting-export"/>').appendTo(parent);
        super(root);

        if (filterProvider) {
            this._filterProvider = filterProvider;
        }
        if (pdfHandler) {
            this._pdfHandler = pdfHandler;
        }

        const lang = Lang.i();

        const stamp = Date.now();
        const excelExportTabId = `sighting-export-tab-excel-${stamp}`;
        const excelReportTabId = `sighting-export-tab-report-${stamp}`;
        const dataPageTabId = `sighting-export-tab-datapage-${stamp}`;

        const nav = jQuery('<ul class="nav nav-tabs" role="tablist"/>').appendTo(root);
        nav.append(
            `<li class="nav-item"><a class="nav-link active" data-toggle="tab" `
            + `href="#${excelExportTabId}">${escapeHtml(lang.l('Excel Export'))}</a></li>`
        );
        nav.append(
            `<li class="nav-item"><a class="nav-link" data-toggle="tab" `
            + `href="#${excelReportTabId}">${escapeHtml(lang.l('Excel Report'))}</a></li>`
        );
        nav.append(
            `<li class="nav-item"><a class="nav-link" data-toggle="tab" `
            + `href="#${dataPageTabId}">${escapeHtml(lang.l('Data Page'))}</a></li>`
        );

        const tabContent = jQuery('<div class="tab-content"/>').appendTo(root);
        this._excelExportBody = jQuery(
            `<div class="tab-pane fade active show sighting-export-pane" id="${excelExportTabId}"/>`
        ).appendTo(tabContent);
        this._excelReportBody = jQuery(
            `<div class="tab-pane fade sighting-export-pane" id="${excelReportTabId}"/>`
        ).appendTo(tabContent);
        this._dataPageBody = jQuery(
            `<div class="tab-pane fade sighting-export-pane" id="${dataPageTabId}"/>`
        ).appendTo(tabContent);

        this._buildExcelExportTab();
        this._buildExcelReportTab();
        this._buildDataPageTab();
    }

    public getExcelExportBody(): JQuery {
        return this._excelExportBody;
    }

    public getExcelReportBody(): JQuery {
        return this._excelReportBody;
    }

    public getDataPageBody(): JQuery {
        return this._dataPageBody;
    }

    /**
     * Render a flat row of column checkboxes into `parent`. `cssClass`
     * is added to each checkbox so the bulk select-all / deselect-all
     * can target a group later. `defaultChecked` controls whether the
     * boxes start ticked.
     * @private
     */
    private _renderColumnRow(parent: JQuery, columns: Column[], cssClass: string, defaultChecked: boolean): void {
        const lang = Lang.i();
        const row = jQuery('<div class="row"/>').appendTo(parent);

        for (const col of columns) {
            const checkedAttr = defaultChecked ? ' checked' : '';
            jQuery(
                '<div class="col-md-4 col-sm-6"><div class="form-check">'
                + `<input type="checkbox"${checkedAttr} class="form-check-input ${cssClass}" `
                + `data-key="${escapeHtml(col.key)}">`
                + ` <label class="form-check-label">${escapeHtml(lang.l(col.label))}</label>`
                + '</div></div>'
            ).appendTo(row);
        }
    }

    /**
     * Render the Excel-Export sub-tab — three cards stacked: column
     * picker (standard + optional, both toggleable + bulk-select),
     * coordinate-format selector, download action.
     * @private
     */
    private _buildExcelExportTab(): void {
        const lang = Lang.i();
        const root = this._excelExportBody;

        // Columns card -------------------------------------------------
        const columnsCard = jQuery('<div class="card"/>').appendTo(root);
        jQuery(
            '<div class="card-header">'
            + `<h3 class="card-title">${escapeHtml(lang.l('Columns'))}</h3>`
            + '</div>'
        ).appendTo(columnsCard);
        const columnsBody = jQuery('<div class="card-body"/>').appendTo(columnsCard);

        // Standard columns -- header + select-all/none buttons + list
        const standardHeader = jQuery('<div class="d-flex align-items-center mb-2"/>').appendTo(columnsBody);
        standardHeader.append(`<h6 class="mb-0">${escapeHtml(lang.l('Standard columns'))}</h6>`);
        const standardBtnGroup = jQuery('<div class="btn-group btn-group-sm ml-auto"/>').appendTo(standardHeader);
        const standardSelectAll = jQuery(
            `<button type="button" class="btn btn-outline-secondary">${escapeHtml(lang.l('Select all'))}</button>`
        ).appendTo(standardBtnGroup);
        const standardDeselectAll = jQuery(
            `<button type="button" class="btn btn-outline-secondary">${escapeHtml(lang.l('Deselect all'))}</button>`
        ).appendTo(standardBtnGroup);

        this._renderColumnRow(columnsBody, STANDARD_COLUMNS, 'excel-export-standard', true);

        standardSelectAll.on('click', () => {
            root.find('.excel-export-standard').prop('checked', true);
        });
        standardDeselectAll.on('click', () => {
            root.find('.excel-export-standard').prop('checked', false);
        });

        // Optional columns -- header + select-all/none buttons + grouped list
        columnsBody.append('<hr>');
        const optionalHeader = jQuery('<div class="d-flex align-items-center mb-2"/>').appendTo(columnsBody);
        optionalHeader.append(`<h6 class="mb-0">${escapeHtml(lang.l('Optional columns'))}</h6>`);
        const optionalBtnGroup = jQuery('<div class="btn-group btn-group-sm ml-auto"/>').appendTo(optionalHeader);
        const optionalSelectAll = jQuery(
            `<button type="button" class="btn btn-outline-secondary">${escapeHtml(lang.l('Select all'))}</button>`
        ).appendTo(optionalBtnGroup);
        const optionalDeselectAll = jQuery(
            `<button type="button" class="btn btn-outline-secondary">${escapeHtml(lang.l('Deselect all'))}</button>`
        ).appendTo(optionalBtnGroup);

        for (const group of OPTIONAL_GROUPS) {
            columnsBody.append(`<h6 class="mt-2 text-muted small">${escapeHtml(lang.l(group.title))}</h6>`);
            this._renderColumnRow(columnsBody, group.columns, 'excel-export-optional', false);
        }

        optionalSelectAll.on('click', () => {
            root.find('.excel-export-optional').prop('checked', true);
        });
        optionalDeselectAll.on('click', () => {
            root.find('.excel-export-optional').prop('checked', false);
        });

        // Coordinate format card ---------------------------------------
        const formatCard = jQuery('<div class="card"/>').appendTo(root);
        jQuery(
            '<div class="card-header">'
            + `<h3 class="card-title">${escapeHtml(lang.l('Coordinate format'))}</h3>`
            + '</div>'
        ).appendTo(formatCard);
        const formatBody = jQuery('<div class="card-body"/>').appendTo(formatCard);
        const formatSelect = jQuery('<select class="form-control" style="max-width: 480px"/>').appendTo(formatBody);

        for (const fmt of COORD_FORMATS) {
            formatSelect.append(`<option value="${escapeHtml(fmt.value)}">${escapeHtml(lang.l(fmt.label))}</option>`);
        }

        // Action card --------------------------------------------------
        const actionCard = jQuery('<div class="card"/>').appendTo(root);
        const actionBody = jQuery('<div class="card-body text-right"/>').appendTo(actionCard);
        const downloadBtn = jQuery(
            '<button type="button" class="btn btn-primary">'
            + `<i class="fa fa-file-excel"></i> ${escapeHtml(lang.l('Download Excel'))}`
            + '</button>'
        ).appendTo(actionBody);

        downloadBtn.on('click', () => {
            const cols: string[] = [];
            root.find('.excel-export-standard:checked, .excel-export-optional:checked').each((_, el) => {
                const key = jQuery(el).data('key');

                if (typeof key === 'string') {
                    cols.push(key);
                }
            });

            const coordFormat = String(formatSelect.val());
            const params = new URLSearchParams();

            if (cols.length > 0) {
                params.set('columns', cols.join(','));
            }

            params.set('coord_format', coordFormat);

            // Forward the page's active filter so the export matches what's listed.
            // Empty strings / 0 are dropped — same shape the list endpoint expects.
            if (this._filterProvider) {
                const f = this._filterProvider();
                if (f.period_from !== '') {
                    params.set('period_from', f.period_from);
                }
                if (f.period_to !== '') {
                    params.set('period_to', f.period_to);
                }
                if (f.species_id > 0) {
                    params.set('species_id', `${f.species_id}`);
                }
                if (f.organization_id > 0) {
                    params.set('organization_id', `${f.organization_id}`);
                }
                if (f.vehicle_id > 0) {
                    params.set('vehicle_id', `${f.vehicle_id}`);
                }
                if (f.vehicle_driver_id > 0) {
                    params.set('vehicle_driver_id', `${f.vehicle_driver_id}`);
                }
                if (f.search !== '') {
                    params.set('search', f.search);
                }
            }

            UtilDownload.download(`/json/sightings/list/excel?${params.toString()}`, 'sightings_list.xlsx');
        });
    }

    /**
     * Render the Excel-Report sub-tab — fills the new AROC "datos SALIDAS"
     * template (one file per boat per half-year per AROC requirements).
     *
     * Pickers (year + semester + boat + external receiver) are filled
     * async; Download stays disabled until receivers + boats are known.
     * @private
     */
    private _buildExcelReportTab(): void {
        const lang = Lang.i();
        const root = this._excelReportBody;

        const card = jQuery('<div class="card"/>').appendTo(root);
        jQuery(
            '<div class="card-header">'
            + `<h3 class="card-title">${escapeHtml(lang.l('AROC office report'))}</h3>`
            + '</div>'
        ).appendTo(card);
        const body = jQuery('<div class="card-body"/>').appendTo(card);

        // Year + semester pickers (one row) ---------------------------
        const periodRow = jQuery('<div class="form-row"/>').appendTo(body);

        const yearGroup = jQuery('<div class="form-group col-md-4"/>').appendTo(periodRow);
        jQuery(
            `<label class="form-label">${escapeHtml(lang.l('Year'))}</label>`
        ).appendTo(yearGroup);
        const yearSelect = jQuery(
            '<select class="form-control" disabled>'
            + `<option value="">${escapeHtml(lang.l('Loading…'))}</option>`
            + '</select>'
        ).appendTo(yearGroup);

        const semesterGroup = jQuery('<div class="form-group col-md-4"/>').appendTo(periodRow);
        jQuery(
            `<label class="form-label">${escapeHtml(lang.l('Semester'))}</label>`
        ).appendTo(semesterGroup);
        const semesterSelect = jQuery(
            '<select class="form-control">'
            + `<option value="">${escapeHtml(lang.l('Full year'))}</option>`
            + `<option value="1">${escapeHtml(lang.l('1st semester (Jan–Jun)'))}</option>`
            + `<option value="2">${escapeHtml(lang.l('2nd semester (Jul–Dec)'))}</option>`
            + '</select>'
        ).appendTo(semesterGroup);

        /*
         * Organization picker — narrows the report to one organization's sightings.
         * Combine with the boat picker for a single boat of a single org;
         * leave on "All organizations" to keep the previous behaviour.
         */
        const organizationGroup = jQuery('<div class="form-group"/>').appendTo(body);
        jQuery(
            `<label class="form-label">${escapeHtml(lang.l('Organization'))}</label>`
        ).appendTo(organizationGroup);
        const organizationSelect = jQuery(
            '<select class="form-control" style="max-width: 480px" disabled>'
            + `<option value="">${escapeHtml(lang.l('Loading…'))}</option>`
            + '</select>'
        ).appendTo(organizationGroup);

        // Boat picker — required for the new AROC template (1 file per boat).
        // No "All boats" option here on purpose: AROC explicitly wants a
        // single boat per file (B7 "Nombre del barco" is mandatory), and the
        // backend rejects the request without `vehicle_id`.
        const vehicleGroup = jQuery('<div class="form-group"/>').appendTo(body);
        jQuery(
            `<label class="form-label">${escapeHtml(lang.l('Boat'))}*</label>`
        ).appendTo(vehicleGroup);
        const vehicleSelect = jQuery(
            '<select class="form-control" style="max-width: 480px" disabled>'
            + `<option value="">${escapeHtml(lang.l('Loading…'))}</option>`
            + '</select>'
        ).appendTo(vehicleGroup);

        // External-receiver picker ------------------------------------
        const receiverGroup = jQuery('<div class="form-group"/>').appendTo(body);
        jQuery(
            `<label class="form-label">${escapeHtml(lang.l('External receiver'))}</label>`
        ).appendTo(receiverGroup);
        const receiverSelect = jQuery(
            '<select class="form-control" style="max-width: 480px" disabled>'
            + `<option value="">${escapeHtml(lang.l('Loading…'))}</option>`
            + '</select>'
        ).appendTo(receiverGroup);

        // Action ------------------------------------------------------
        const actionWrap = jQuery('<div class="text-right mt-3"/>').appendTo(body);
        const downloadBtn = jQuery(
            '<button type="button" class="btn btn-primary" disabled>'
            + `<i class="fa fa-file-excel"></i> ${escapeHtml(lang.l('Download report'))}`
            + '</button>'
        ).appendTo(actionWrap);

        SightingsApi.getYears().then((years) => {
            yearSelect.empty();
            yearSelect.append(
                `<option value="">${escapeHtml(lang.l('All years'))}</option>`
            );

            for (const y of years) {
                yearSelect.append(`<option value="${y}">${y}</option>`);
            }

            if (years.length > 0) {
                yearSelect.val(`${years[0]}`);
            }

            yearSelect.prop('disabled', false);
            // Trigger refresh so the boat list reflects the auto-picked year
            // (jQuery `.val()` doesn't fire change on its own).
            yearSelect.trigger('change');
        }).catch(() => {
            yearSelect.empty();
            yearSelect.append(
                `<option value="">${escapeHtml(lang.l('All years'))}</option>`
            );
            yearSelect.prop('disabled', false);
        });

        OrganizationApi.getOrganizationByUser().then((orgs) => {
            organizationSelect.empty();
            organizationSelect.append(
                `<option value="">${escapeHtml(lang.l('All organizations'))}</option>`
            );

            if (orgs) {
                for (const o of orgs) {
                    organizationSelect.append(
                        `<option value="${o.id}">${escapeHtml(o.description)}</option>`
                    );
                }
            }

            organizationSelect.prop('disabled', false);
        }).catch(() => {
            organizationSelect.empty();
            organizationSelect.append(
                `<option value="">${escapeHtml(lang.l('All organizations'))}</option>`
            );
            organizationSelect.prop('disabled', false);
        });

        /*
         * Refresh the boat picker from /json/officereport/used_vehicles using
         * the currently picked year/semester/organization. Race-guarded via a
         * monotonically increasing sequence — only the latest in-flight
         * request is allowed to update the UI, so quickly toggling year +
         * semester can't leave a stale list on screen. The previously
         * selected boat is preserved if it's still in the new list,
         * otherwise the picker falls back to "All boats".
         */
        let vehicleFetchSeq = 0;
        const refreshVehicles = (): void => {
            const currentVal = String(vehicleSelect.val() ?? '');
            const seq = ++vehicleFetchSeq;

            const yearVal = parseInt(String(yearSelect.val() ?? ''), 10);
            const semesterRaw = String(semesterSelect.val() ?? '');
            const orgVal = parseInt(String(organizationSelect.val() ?? ''), 10);

            const filter: UsedVehiclesFilter = {};
            if (Number.isFinite(yearVal) && yearVal > 0) {
                filter.year = yearVal;
            }
            if (semesterRaw === '1' || semesterRaw === '2') {
                filter.semester = semesterRaw === '1' ? 1 : 2;
            }
            if (Number.isFinite(orgVal) && orgVal > 0) {
                filter.organizationId = orgVal;
            }

            vehicleSelect.prop('disabled', true);

            OfficeReportApi.getUsedVehicles(filter).then((vehicles) => {
                if (seq !== vehicleFetchSeq) {
                    return;
                }

                vehicleSelect.empty();
                vehicleSelect.append(
                    `<option value="">${escapeHtml(lang.l('— Select a boat —'))}</option>`
                );

                let preserved = false;
                for (const v of vehicles) {
                    vehicleSelect.append(
                        `<option value="${v.id}">${escapeHtml(v.name)}</option>`
                    );
                    if (`${v.id}` === currentVal) {
                        preserved = true;
                    }
                }

                if (preserved) {
                    vehicleSelect.val(currentVal);
                } else {
                    vehicleSelect.val('');
                }

                vehicleSelect.prop('disabled', false);
                vehicleSelect.trigger('change');
            }).catch(() => {
                if (seq !== vehicleFetchSeq) {
                    return;
                }

                vehicleSelect.empty();
                vehicleSelect.append(
                    `<option value="">${escapeHtml(lang.l('— Select a boat —'))}</option>`
                );
                vehicleSelect.prop('disabled', false);
                vehicleSelect.trigger('change');
            });
        };

        yearSelect.on('change', refreshVehicles);
        semesterSelect.on('change', refreshVehicles);
        organizationSelect.on('change', refreshVehicles);

        refreshVehicles();

        // Download is gated on BOTH a boat being picked (AROC requirement) AND
        // a receiver being available. Recompute whenever either side changes.
        let receiversReady = false;
        const updateDownloadEnabled = (): void => {
            const vehicleVal = parseInt(String(vehicleSelect.val() ?? ''), 10);
            const hasBoat = Number.isFinite(vehicleVal) && vehicleVal > 0;
            downloadBtn.prop('disabled', !(receiversReady && hasBoat));
        };
        vehicleSelect.on('change', updateDownloadEnabled);

        OfficeReportApi.getReceivers().then((receivers) => {
            receiverSelect.empty();

            if (receivers.length === 0) {
                receiverSelect.append(
                    `<option value="">${escapeHtml(lang.l('No receivers configured'))}</option>`
                );
                receiverSelect.prop('disabled', true);
                receiversReady = false;
                updateDownloadEnabled();
                return;
            }

            for (const r of receivers) {
                receiverSelect.append(
                    `<option value="${r.id}">${escapeHtml(r.name)}</option>`
                );
            }

            receiverSelect.val(`${receivers[0].id}`);
            receiverSelect.prop('disabled', false);
            receiversReady = true;
            updateDownloadEnabled();
        }).catch(() => {
            receiverSelect.empty();
            receiverSelect.append(
                `<option value="">${escapeHtml(lang.l('No receivers configured'))}</option>`
            );
            receiverSelect.prop('disabled', true);
            receiversReady = false;
            updateDownloadEnabled();
        });

        // Going through fetch+blob (instead of UtilDownload.download)
        // because Chrome's Safe-Browsing heuristics on self-signed certs
        // sometimes silently swallow programmatic anchor downloads of
        // office files. fetch+blob bypasses that and surfaces real errors.
        downloadBtn.on('click', async() => {
            const params = new URLSearchParams();
            const yearVal = String(yearSelect.val() ?? '').trim();

            if (yearVal !== '') {
                params.set('year', yearVal);
            }

            const semesterVal = String(semesterSelect.val() ?? '').trim();
            if (semesterVal === '1' || semesterVal === '2') {
                params.set('semester', semesterVal);
            }

            const vehicleVal = parseInt(String(vehicleSelect.val() ?? ''), 10);
            if (!Number.isFinite(vehicleVal) || vehicleVal <= 0) {
                window.alert(lang.l('Please pick a boat — AROC requires one file per boat.'));
                return;
            }
            params.set('vehicle_id', `${vehicleVal}`);

            const receiverVal = parseInt(String(receiverSelect.val() ?? ''), 10);

            if (Number.isFinite(receiverVal) && receiverVal > 0) {
                params.set('external_receiver_id', `${receiverVal}`);
            }

            const query = params.toString();
            const url = query === ''
                ? '/json/officereport/create_export'
                : `/json/officereport/create_export?${query}`;

            const originalLabel = downloadBtn.html();
            downloadBtn.prop('disabled', true);
            downloadBtn.html(
                `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(lang.l('Generating…'))}`
            );

            let objectUrl: string|null = null;

            try {
                const resp = await fetch(url, {credentials: 'same-origin'});

                if (!resp.ok) {
                    const text = await resp.text().catch(() => '');
                    throw new Error(
                        `Download failed: ${resp.status} ${resp.statusText} ${text}`.trim()
                    );
                }

                const blob = await resp.blob();
                objectUrl = URL.createObjectURL(blob);

                // Pull the suggested filename from the server's
                // Content-Disposition (AROC - YEAR - HALF - BOAT.xlsx). Fall
                // back to a generic name only if the header is missing or
                // doesn't parse.
                const cd = resp.headers.get('Content-Disposition') ?? '';
                const cdMatch = cd.match(/filename="([^"]+)"/);
                const downloadName = cdMatch ? cdMatch[1] : 'AROC.xlsx';

                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = downloadName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (e) {
                console.error('[AROC] download error', e);
                window.alert(`${lang.l('Download failed')}: ${(e as Error).message}`);
            } finally {
                if (objectUrl !== null) {
                    URL.revokeObjectURL(objectUrl);
                }
                downloadBtn.html(originalLabel);
                downloadBtn.prop('disabled', false);
            }
        });
    }

    /**
     * Render the Data-Page sub-tab — single button that hands off to the page's
     * PDF orchestrator. The widget intentionally doesn't know how Map / Analytics /
     * Year-comparison render; the page wires those up in `pdfHandler`.
     * @private
     */
    private _buildDataPageTab(): void {
        const lang = Lang.i();
        const root = this._dataPageBody;

        const card = jQuery('<div class="card"/>').appendTo(root);
        jQuery(
            '<div class="card-header">'
            + `<h3 class="card-title">${escapeHtml(lang.l('Data Page'))}</h3>`
            + '</div>'
        ).appendTo(card);
        const body = jQuery('<div class="card-body"/>').appendTo(card);

        jQuery(
            `<p>${escapeHtml(lang.l(
                'Combines map, analytics and year comparison on a printable sheet. '
                + 'Uses the browser\'s print dialog — pick "Save as PDF" there.'
            ))}</p>`
        ).appendTo(body);

        const actionWrap = jQuery('<div class="text-right mt-3"/>').appendTo(body);
        const printBtn = jQuery(
            '<button type="button" class="btn btn-primary">'
            + `<i class="fa fa-file-pdf"></i> ${escapeHtml(lang.l('Generate PDF'))}`
            + '</button>'
        ).appendTo(actionWrap);

        if (!this._pdfHandler) {
            printBtn.prop('disabled', true);
            printBtn.attr('title', 'PDF handler not wired up');
            return;
        }

        printBtn.on('click', async() => {
            const originalLabel = printBtn.html();
            printBtn.prop('disabled', true);
            printBtn.html(
                `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(lang.l('Generating…'))}`
            );

            try {
                await this._pdfHandler!();
            } catch (e) {
                console.error('[Data Page] generate failed', e);
                window.alert(`${lang.l('Download failed')}: ${(e as Error).message}`);
            } finally {
                printBtn.html(originalLabel);
                printBtn.prop('disabled', false);
            }
        });
    }

}