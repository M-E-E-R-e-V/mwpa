/* global JQuery */
import {FormGroup2, Input2, InputType2, LangTextV2, Select2, Textarea2} from 'bambooo';
import {Lang} from '../Lang';
import {InputGroup} from './InputGroup';

/**
 * Options for a form field built with {@link FormLayout}.
 */
export type FormLayoutFieldOptions = {

    /**
     * FontAwesome 5 classes for the leading input-group icon
     */
    icon?: string;

    /**
     * Trailing unit text (e.g. "°")
     */
    suffix?: string;

    /**
     * English source text, translated via Lang
     */
    placeholder?: string;

    /**
     * bambooo input type (default text)
     */
    type?: InputType2;

    /**
     * Native HTML type override (email, url, …)
     */
    htmlType?: string;

    /**
     * Show a red asterisk after the label
     */
    required?: boolean;
};

/**
 * Shared layout helpers for edit dialogs (Bootstrap 5): titled sections with
 * icon + hint, and labelled fields wrapped in an input-group with a leading
 * icon / trailing unit. Used by the organization and species edit dialogs so
 * they look alike.
 */
export class FormLayout {

    /**
     * Counter for unique switch ids
     * @protected
     */
    protected static _switchCounter: number = 0;

    /**
     * Add a titled section (icon + heading + optional hint) and return its body.
     * @param {JQuery} parent
     * @param {string} icon FontAwesome 5 classes
     * @param {string} title English source text (translated)
     * @param {string} [hint] English source text (translated)
     * @return {JQuery}
     */
    public static section(parent: JQuery, icon: string, title: string, hint?: string): JQuery {
        const section = jQuery('<div class="mb-3"/>').appendTo(parent);

        const heading = jQuery('<h6 class="text-primary fw-bold border-bottom border-primary border-2 pb-1 mb-2"/>').appendTo(section);
        jQuery('<i class="me-2"/>').addClass(icon).appendTo(heading);
        jQuery('<span/>').text(Lang.i().l(title)).appendTo(heading);

        if (hint) {
            jQuery('<div class="small text-body-secondary mb-2"/>').text(Lang.i().l(hint)).appendTo(section);
        }

        return section;
    }

    /**
     * Add a labelled text/number input into a column.
     * @param {JQuery} col
     * @param {string} label English source text (LangTextV2)
     * @param {FormLayoutFieldOptions} opt
     * @return {Input2}
     */
    public static input(col: JQuery, label: string, opt: FormLayoutFieldOptions = {}): Input2 {
        const target = FormLayout._field(col, label, opt);

        const input = new Input2({type: opt.type ?? InputType2.text});
        input.appendTo(target);

        if (opt.placeholder) {
            input.setPlaceholder(Lang.i().l(opt.placeholder));
        }

        if (opt.htmlType) {
            input.getElement().attr('type', opt.htmlType);
        }

        FormLayout._suffix(target, opt);

        return input;
    }

    /**
     * Add a labelled select into a column.
     * @param {JQuery} col
     * @param {string} label English source text (LangTextV2)
     * @param {FormLayoutFieldOptions} opt
     * @return {Select2}
     */
    public static select(col: JQuery, label: string, opt: FormLayoutFieldOptions = {}): Select2 {
        const target = FormLayout._field(col, label, opt);

        const select = new Select2({});
        select.appendTo(target);

        FormLayout._suffix(target, opt);

        return select;
    }

    /**
     * Add a labelled multi-line text field into a column.
     * @param {JQuery} col
     * @param {string} label English source text (LangTextV2)
     * @param {FormLayoutFieldOptions & {rows?: number}} opt
     * @return {Textarea2}
     */
    public static textarea(col: JQuery, label: string, opt: FormLayoutFieldOptions & {rows?: number;} = {}): Textarea2 {
        const target = FormLayout._field(col, label, {required: opt.required});

        const textarea = new Textarea2({rows: opt.rows ?? 3});
        textarea.appendTo(target);

        if (opt.placeholder) {
            textarea.setPlaceholder(Lang.i().l(opt.placeholder));
        }

        return textarea;
    }

    /**
     * Add a switch with a bold label and a hint below it.
     * @param {JQuery} parent
     * @param {string} label English source text
     * @param {string} [hint] English source text
     * @return {JQuery<HTMLInputElement>}
     */
    public static switch(parent: JQuery, label: string, hint?: string): JQuery<HTMLInputElement> {
        FormLayout._switchCounter++;
        const id = `mwpa-form-switch-${FormLayout._switchCounter}`;

        const wrap = jQuery('<div class="form-check form-switch mb-3"/>').appendTo(parent);
        const input = jQuery<HTMLInputElement>('<input class="form-check-input" type="checkbox" role="switch">')
        .attr('id', id)
        .appendTo(wrap);
        const labelEl = jQuery('<label class="form-check-label d-block"/>').attr('for', id).appendTo(wrap);
        jQuery('<span class="fw-semibold"/>').text(Lang.i().l(label)).appendTo(labelEl);

        if (hint) {
            jQuery('<span class="d-block small text-body-secondary"/>').text(Lang.i().l(hint)).appendTo(labelEl);
        }

        return input;
    }

    /**
     * Add a small external link (hidden until a href is set via
     * {@link setLink}). Pass {@link fieldOf} as parent to place it directly
     * under a field.
     * @param {JQuery} parent
     * @param {string} text English source text (translated)
     * @return {JQuery<HTMLAnchorElement>}
     */
    public static link(parent: JQuery, text: string): JQuery<HTMLAnchorElement> {
        const wrap = jQuery('<div class="form-text small d-none"/>').appendTo(parent);
        const link = jQuery<HTMLAnchorElement>('<a target="_blank" rel="noopener noreferrer"/>').appendTo(wrap);
        jQuery('<i class="fas fa-external-link-alt me-1"/>').appendTo(link);
        jQuery('<span/>').text(Lang.i().l(text)).appendTo(link);

        return link;
    }

    /**
     * The form-group element around a control (to append help/links to).
     * @param {Input2|Select2} control
     * @return {JQuery}
     */
    public static fieldOf(control: Input2 | Select2): JQuery {
        return control.getElement().closest('.form-group');
    }

    /**
     * Point a link from {@link link} to a url, or hide it (null).
     * @param {JQuery<HTMLAnchorElement>} link
     * @param {string|null} href
     */
    public static setLink(link: JQuery<HTMLAnchorElement>, href: string | null): void {
        link.parent().toggleClass('d-none', href === null);

        if (href !== null) {
            link.attr('href', href);
        }
    }

    /**
     * Form group + optional input-group with leading icon.
     * @param {JQuery} col
     * @param {string} label
     * @param {FormLayoutFieldOptions} opt
     * @return {JQuery} element the control is appended to
     * @protected
     */
    protected static _field(col: JQuery, label: string, opt: FormLayoutFieldOptions): JQuery {
        const group = new FormGroup2({label: new LangTextV2({text: label})});
        group.appendTo(col);

        if (opt.required) {
            jQuery('<span class="text-danger ms-1">*</span>').appendTo(group.getLabelElement());
        }

        let target: JQuery = group.getElement();

        if (opt.icon || opt.suffix) {
            target = new InputGroup(group).getElement();
        }

        if (opt.icon) {
            const pre = jQuery('<span class="input-group-text"/>').appendTo(target);
            jQuery('<i class="fa-fw"/>').addClass(opt.icon).appendTo(pre);
        }

        return target;
    }

    /**
     * Trailing unit text.
     * @param {JQuery} target
     * @param {FormLayoutFieldOptions} opt
     * @protected
     */
    protected static _suffix(target: JQuery, opt: FormLayoutFieldOptions): void {
        if (opt.suffix) {
            jQuery('<span class="input-group-text"/>').text(opt.suffix).appendTo(target);
        }
    }

}