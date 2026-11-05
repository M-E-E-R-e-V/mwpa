/* global JQuery */
import {
    ButtonClass2,
    ButtonDefault2,
    FormGroup2,
    Input2,
    InputType2,
    ModalDialog2,
    ModalDialogType2,
    Select2,
    SelectOption2,
    Switch2
} from 'bambooo';
import {Lang} from '../../Lang';

/**
 * Sortable column offered in the dialog
 */
export type TableFilterSortColumn = {
    key: string;
    label: string;
};

/**
 * Select filter (e.g. species, vehicle) offered in the dialog
 */
export type TableFilterSelect = {
    key: string;
    label: string;
    options: SelectOption2[];
};

/**
 * Boolean option offered in the dialog
 */
export type TableFilterToggle = {
    key: string;
    label: string;
};

/**
 * Per-table description of what a preset can set
 */
export type TableFilterModalConfig = {
    sortColumns: TableFilterSortColumn[];
    toggles: TableFilterToggle[];
    selects: TableFilterSelect[];
    search: boolean;

    /**
     * Period modes; the mode key 'absolute' shows the from/to date inputs.
     * Omit for tables without a date period.
     */
    periodModes?: SelectOption2[];
};

/**
 * Values edited by the dialog (table-neutral)
 */
export type TableFilterModalValues = {
    name: string;
    sortKey: string;
    sortDir: 'asc' | 'desc';
    toggles: Record<string, boolean>;
    selects: Record<string, string>;
    search: string;
    periodMode: string;
    periodFrom: string;
    periodTo: string;
};

/**
 * What the user chose: `save` = store as preset (name required), `apply` =
 * filter the list now without saving.
 */
export type TableFilterModalResult = {
    action: 'save' | 'apply';
    values: TableFilterModalValues;
};

/**
 * Generic dialog to create/edit a saved list filter preset (ported from
 * kavula #94). The table describes its sortable columns, toggles, select
 * filters and period modes via {@link TableFilterModalConfig}; the dialog
 * returns table-neutral values the table maps onto its own settings JSON.
 *
 * mwpa addition: an "Apply" button to filter ad hoc without saving.
 */
export class TableFilterModal extends ModalDialog2 {

    protected _resolve: ((result: TableFilterModalResult|null) => void)|null = null;

    protected _result: TableFilterModalResult|null = null;

    protected _inputName: Input2|null = null;

    protected _selectSort: Select2|null = null;

    protected _selectDir: Select2|null = null;

    protected _toggles: Map<string, Switch2> = new Map<string, Switch2>();

    protected _selects: Map<string, Select2> = new Map<string, Select2>();

    protected _inputSearch: Input2|null = null;

    protected _selectPeriod: Select2|null = null;

    protected _inputFrom: Input2|null = null;

    protected _inputTo: Input2|null = null;

    protected _error: JQuery|null = null;

    public constructor() {
        super({id: 'tablefiltermodaldialog', modalType: ModalDialogType2.large});

        const l = TableFilterModal._l;

        this.addButtonClose(l('Cancel'));

        const btnApply = new ButtonDefault2({
            title: l('Apply (without saving)'),
            btnClass: ButtonClass2.default
        });

        btnApply.appendTo(this.getFooter());
        btnApply.setOnClickFn((): void => {
            this._result = {action: 'apply', values: this._collect()};
            this.hide();
        });

        this.addButtonSave(l('Save filter'), false);

        this.setOnSave(async(): Promise<void> => {
            const values = this._collect();

            if (values.name === '') {
                this._error?.text(l('Name is required')).show();
                return;
            }

            this._result = {action: 'save', values};
            this.hide();
        });

        this.setOnHidden(async(): Promise<void> => {
            const resolve = this._resolve;
            this._resolve = null;
            resolve?.(this._result);
        });
    }

    /**
     * Translate with the key as fallback
     * @param {string} key
     * @returns {string}
     * @protected
     */
    protected static _l(key: string): string {
        return Lang.i().l(key) ?? key;
    }

    /**
     * Create a labelled form group
     * @param {JQuery} body
     * @param {string} label
     * @returns {FormGroup2}
     * @protected
     */
    protected static _group(body: JQuery, label: string): FormGroup2 {
        const group = new FormGroup2({label});
        group.appendTo(body);
        return group;
    }

    /**
     * Render the form and wait for the user's decision.
     * @param {string} title
     * @param {TableFilterModalConfig} config
     * @param {TableFilterModalValues} values prefill
     * @returns {Promise<TableFilterModalResult|null>} null = cancelled
     */
    public ask(
        title: string,
        config: TableFilterModalConfig,
        values: TableFilterModalValues
    ): Promise<TableFilterModalResult|null> {
        const l = TableFilterModal._l;
        const body = this.getBody();
        body.empty();

        this.setTitle(title);
        this._result = null;
        this._toggles = new Map<string, Switch2>();
        this._selects = new Map<string, Select2>();
        this._inputSearch = null;
        this._selectPeriod = null;
        this._inputFrom = null;
        this._inputTo = null;

        const card = jQuery('<div class="card-body"/>').appendTo(body);

        // name
        this._inputName = new Input2({});
        this._inputName.appendTo(TableFilterModal._group(card, l('Filter name')));
        this._inputName.setValue(values.name);
        this._inputName.setPlaceholder(l('only needed for saving'));

        // period
        if (config.periodModes && config.periodModes.length > 0) {
            const periodRow = jQuery('<div class="row"/>').appendTo(card);
            const modeCol = jQuery('<div class="col-md-4"/>').appendTo(periodRow);
            const fromCol = jQuery('<div class="col-md-4"/>').appendTo(periodRow);
            const toCol = jQuery('<div class="col-md-4"/>').appendTo(periodRow);

            this._selectPeriod = new Select2({});
            this._selectPeriod.appendTo(TableFilterModal._group(modeCol, l('Period')));
            this._selectPeriod.setValues(config.periodModes);
            this._selectPeriod.setSelectedValue(values.periodMode);

            this._inputFrom = new Input2({type: InputType2.date});
            this._inputFrom.appendTo(TableFilterModal._group(fromCol, l('From')));
            this._inputFrom.setValue(values.periodFrom);

            this._inputTo = new Input2({type: InputType2.date});
            this._inputTo.appendTo(TableFilterModal._group(toCol, l('To')));
            this._inputTo.setValue(values.periodTo);

            const syncDates = (): void => {
                const absolute = this._selectPeriod?.getSelectedValue() === 'absolute';
                fromCol.toggle(absolute);
                toCol.toggle(absolute);
            };

            this._selectPeriod.setChangeFn(syncDates);
            syncDates();
        }

        // select filters
        if (config.selects.length > 0) {
            const selRow = jQuery('<div class="row"/>').appendTo(card);

            for (const filter of config.selects) {
                const col = jQuery('<div class="col-md-6"/>').appendTo(selRow);
                const select = new Select2({});
                select.appendTo(TableFilterModal._group(col, filter.label));
                select.setValues(filter.options);
                select.setSelectedValue(values.selects[filter.key] ?? '');
                this._selects.set(filter.key, select);
            }
        }

        // search
        if (config.search) {
            this._inputSearch = new Input2({});
            this._inputSearch.appendTo(TableFilterModal._group(card, l('Search term')));
            this._inputSearch.setValue(values.search);
        }

        // toggles
        for (const toggle of config.toggles) {
            const wrap = jQuery('<div class="mb-3"/>').appendTo(card);
            const sw = new Switch2({label: toggle.label});
            sw.appendTo(wrap);
            sw.setEnable(values.toggles[toggle.key] ?? false);
            this._toggles.set(toggle.key, sw);
        }

        // sorting
        const sortRow = jQuery('<div class="row"/>').appendTo(card);
        const sortCol = jQuery('<div class="col-md-8"/>').appendTo(sortRow);
        const dirCol = jQuery('<div class="col-md-4"/>').appendTo(sortRow);

        this._selectSort = new Select2({});
        this._selectSort.appendTo(TableFilterModal._group(sortCol, l('Sort by')));
        this._selectSort.setValues([
            {key: '', value: l('Default')},
            ...config.sortColumns.map((column) => ({key: column.key, value: column.label}))
        ]);
        this._selectSort.setSelectedValue(values.sortKey);

        this._selectDir = new Select2({});
        this._selectDir.appendTo(TableFilterModal._group(dirCol, l('Direction')));
        this._selectDir.setValues([
            {key: 'desc', value: l('Descending')},
            {key: 'asc', value: l('Ascending')}
        ]);
        this._selectDir.setSelectedValue(values.sortDir);

        this._error = jQuery('<div class="text-danger small"/>').hide().appendTo(card);

        return new Promise<TableFilterModalResult|null>((resolve) => {
            this._resolve = resolve;
            this.show();
        });
    }

    /**
     * Read the form values
     * @returns {TableFilterModalValues}
     * @protected
     */
    protected _collect(): TableFilterModalValues {
        const toggles: Record<string, boolean> = {};
        const selects: Record<string, string> = {};

        for (const [key, sw] of this._toggles) {
            toggles[key] = sw.isEnable();
        }

        for (const [key, select] of this._selects) {
            selects[key] = select.getSelectedValue();
        }

        const periodMode = this._selectPeriod?.getSelectedValue() ?? '';

        return {
            name: (this._inputName?.getValue() ?? '').trim(),
            sortKey: this._selectSort?.getSelectedValue() ?? '',
            sortDir: this._selectDir?.getSelectedValue() === 'asc' ? 'asc' : 'desc',
            toggles,
            selects,
            search: (this._inputSearch?.getValue() ?? '').trim(),
            periodMode,
            periodFrom: periodMode === 'absolute' ? this._inputFrom?.getValue() ?? '' : '',
            periodTo: periodMode === 'absolute' ? this._inputTo?.getValue() ?? '' : ''
        };
    }

}