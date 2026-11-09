/* global JQuery */
import {Lang} from '../Lang';

/**
 * Shared building blocks for the admin list pages (species, vehicles, …), so
 * they look and behave alike: a toolbar with search + filters, summary
 * figures, highlighted search hits, status pills, row action buttons and an
 * empty-result note. All labels are English source texts, translated here.
 */
export class AdminListUi {

    /**
     * HTML-escape a string.
     * @param {string} s
     * @return {string}
     */
    public static escape(s: string): string {
        return s
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;')
        .replace(/'/gu, '&#39;');
    }

    /**
     * Escape and mark the (case-insensitive) search term.
     * @param {string} text
     * @param {string} term
     * @return {string} HTML
     */
    public static highlight(text: string, term: string): string {
        const escaped = AdminListUi.escape(text);

        if (text === '' || term === '') {
            return escaped;
        }

        const safe = AdminListUi.escape(term).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
        return escaped.replace(new RegExp(safe, 'giu'), (match) => `<mark class="px-0">${match}</mark>`);
    }

    /**
     * Toolbar row (append search / selects / switches to it).
     * @param {JQuery} parent
     * @return {JQuery}
     */
    public static toolbar(parent: JQuery): JQuery {
        return jQuery('<div class="d-flex flex-wrap align-items-center gap-2 px-3 pt-3"/>').appendTo(parent);
    }

    /**
     * Search field with icon; calls onSearch (debounced) with the trimmed value.
     * @param {JQuery} toolbar
     * @param {string} placeholder English source text
     * @param {(term: string) => void} onSearch
     * @return {JQuery<HTMLInputElement>}
     */
    public static search(toolbar: JQuery, placeholder: string, onSearch: (term: string) => void): JQuery<HTMLInputElement> {
        const group = jQuery('<div class="input-group input-group-sm" style="max-width:340px;"/>').appendTo(toolbar);
        jQuery('<span class="input-group-text"><i class="fas fa-search"></i></span>').appendTo(group);
        const input = jQuery<HTMLInputElement>('<input type="search" class="form-control form-control-sm">')
        .attr('placeholder', Lang.i().l(placeholder))
        .appendTo(group);

        let timer: ReturnType<typeof setTimeout> | null = null;
        let last = '';

        input.on('input', (): void => {
            if (timer !== null) {
                clearTimeout(timer);
            }

            timer = setTimeout((): void => {
                const value = `${input.val() ?? ''}`.trim();

                if (value !== last) {
                    last = value;
                    onSearch(value);
                }
            }, 250);
        });

        return input;
    }

    /**
     * Small select; the first option is the "all" entry (value '0').
     * @param {JQuery} toolbar
     * @param {string} allLabel English source text
     * @param {(value: string) => void} onChange
     * @return {JQuery<HTMLSelectElement>}
     */
    public static select(toolbar: JQuery, allLabel: string, onChange: (value: string) => void): JQuery<HTMLSelectElement> {
        const select = jQuery<HTMLSelectElement>('<select class="form-select form-select-sm" style="max-width:220px;"/>').appendTo(toolbar);
        jQuery('<option value="0"/>').text(Lang.i().l(allLabel)).appendTo(select);
        select.on('change', (): void => onChange(`${select.val() ?? '0'}`));
        return select;
    }

    /**
     * Replace the options of a select from {@link select} (keeps the "all"
     * entry and the current value when it still exists).
     * @param {JQuery<HTMLSelectElement>} select
     * @param {{value: string; label: string;}[]} options label already translated / data
     */
    public static setOptions(select: JQuery<HTMLSelectElement>, options: {value: string; label: string;}[]): void {
        const current = `${select.val() ?? '0'}`;
        select.find('option:not(:first)').remove();

        for (const option of options) {
            jQuery('<option/>').attr('value', option.value).text(option.label).appendTo(select);
        }

        select.val(options.some((o) => o.value === current) ? current : '0');
    }

    /**
     * Toggle switch.
     * @param {JQuery} toolbar
     * @param {string} id unique element id
     * @param {string} label English source text
     * @param {(checked: boolean) => void} onChange
     * @return {JQuery<HTMLInputElement>}
     */
    public static switch(toolbar: JQuery, id: string, label: string, onChange: (checked: boolean) => void): JQuery<HTMLInputElement> {
        const wrap = jQuery('<div class="form-check form-switch mb-0 ms-2"/>').appendTo(toolbar);
        const input = jQuery<HTMLInputElement>('<input class="form-check-input" type="checkbox" role="switch">').attr('id', id).appendTo(wrap);
        jQuery('<label class="form-check-label small"/>').attr('for', id).text(Lang.i().l(label)).appendTo(wrap);
        input.on('change', (): void => onChange(input.prop('checked') === true));
        return input;
    }

    /**
     * "x of y shown" text, right-aligned in the toolbar.
     * @param {JQuery} toolbar
     * @return {JQuery}
     */
    public static resultInfo(toolbar: JQuery): JQuery {
        return jQuery('<div class="small text-body-secondary ms-auto"/>').appendTo(toolbar);
    }

    /**
     * Set the "x of y shown" text.
     * @param {JQuery} info
     * @param {number} shown
     * @param {number} total
     */
    public static setResult(info: JQuery, shown: number, total: number): void {
        const lang = Lang.i();
        info.text(`${shown} ${lang.l('of')} ${total} ${lang.l('shown')}`);
    }

    /**
     * Row for the summary figures.
     * @param {JQuery} parent
     * @return {JQuery}
     */
    public static statsRow(parent: JQuery): JQuery {
        return jQuery('<div class="d-flex flex-wrap gap-2 px-3 py-3 border-bottom"/>').appendTo(parent);
    }

    /**
     * Summary figure tile.
     * @param {JQuery} parent
     * @param {string} icon FontAwesome 5 classes
     * @param {string} value e.g. "24 / 26"
     * @param {string} label English source text
     * @param {string} [iconClass] e.g. 'text-success'
     * @return {JQuery}
     */
    public static stat(parent: JQuery, icon: string, value: string, label: string, iconClass: string = 'text-body-secondary'): JQuery {
        const stat = jQuery('<div class="d-flex align-items-center gap-2 px-3 py-1 border rounded bg-body"/>').appendTo(parent);
        jQuery('<i/>').addClass(`${icon} ${iconClass}`).appendTo(stat);
        const text = jQuery('<div class="lh-sm"/>').appendTo(stat);
        jQuery('<div class="fw-bold"/>').text(value).appendTo(text);
        jQuery('<div class="small text-body-secondary"/>').text(Lang.i().l(label)).appendTo(text);
        return stat;
    }

    /**
     * Soft status pill.
     * @param {JQuery} parent
     * @param {string} label English source text
     * @param {'success'|'warning'|'secondary'|'danger'|'primary'} tone
     * @param {string} [icon] FontAwesome 5 classes
     * @return {JQuery}
     */
    public static pill(
        parent: JQuery,
        label: string,
        tone: 'success' | 'warning' | 'secondary' | 'danger' | 'primary',
        icon?: string
    ): JQuery {
        const pill = jQuery('<span class="badge rounded-pill border fw-normal"/>')
        .addClass(`text-${tone}-emphasis bg-${tone}-subtle border-${tone}-subtle`)
        .appendTo(parent);

        if (icon) {
            jQuery('<i class="me-1"/>').addClass(icon).appendTo(pill);
        }

        jQuery('<span/>').text(Lang.i().l(label)).appendTo(pill);
        return pill;
    }

    /**
     * Name cell content: bold link (click → onOpen) plus optional sub line.
     * @param {JQuery} parent
     * @param {string} html already escaped / highlighted
     * @param {() => void} onOpen
     * @return {JQuery}
     */
    public static nameLink(parent: JQuery, html: string, onOpen: () => void): JQuery {
        const link = jQuery('<a href="#" class="fw-semibold text-decoration-none text-body"/>').html(html).appendTo(parent);
        link.on('click', (e): void => {
            e.preventDefault();
            onOpen();
        });
        return link;
    }

    /**
     * Right-aligned action area with an "edit" button; append a ButtonMenu2 to it.
     * @param {JQuery} parent
     * @param {() => void} onEdit
     * @return {JQuery} the action container
     */
    public static actions(parent: JQuery, onEdit: () => void): JQuery {
        const actions = jQuery('<div class="d-flex justify-content-end align-items-center gap-1"/>').appendTo(parent);
        const edit = jQuery('<button type="button" class="btn btn-sm btn-outline-primary"/>')
        .attr('title', Lang.i().l('Edit'))
        .appendTo(actions);
        jQuery('<i class="fas fa-edit"/>').appendTo(edit);
        edit.on('click', onEdit);
        return actions;
    }

    /**
     * Note shown instead of an empty table (toggle with {@link setEmpty}).
     * @param {JQuery} parent
     * @param {string} text English source text
     * @return {JQuery}
     */
    public static emptyInfo(parent: JQuery, text: string): JQuery {
        const info = jQuery('<div class="text-center text-body-secondary py-5 d-none"/>').appendTo(parent);
        jQuery('<i class="fas fa-search fa-2x mb-2 d-block opacity-50"/>').appendTo(info);
        jQuery('<span/>').text(Lang.i().l(text)).appendTo(info);
        return info;
    }

    /**
     * Show / hide the empty note.
     * @param {JQuery} info
     * @param {boolean} empty
     */
    public static setEmpty(info: JQuery, empty: boolean): void {
        info.toggleClass('d-none', !empty);
    }

}