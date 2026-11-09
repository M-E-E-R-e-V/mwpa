/* global JQuery */
import {Lang} from '../../../Lang';

/**
 * One right checkbox in the role-rights dialog: label + hint where the right
 * takes effect. Keeps its own (stored) checked state separate from what is
 * displayed, so a row can be shown as "inherited" (ticked + locked) while its
 * area's full-access right is set, without losing the role's real grant.
 */
export class RoleRightEntry {

    protected static _idCounter: number = 0;

    protected _element: JQuery;

    protected _input: JQuery<HTMLInputElement>;

    protected _rightId: number;

    protected _rightKey: string;

    protected _checked: boolean = false;

    protected _inherited: boolean = false;

    protected _searchText: string;

    /**
     * Constructor
     * @param {JQuery} parent
     * @param {number} rightId
     * @param {string} rightKey
     * @param {string} label already translated
     * @param {string} hint already translated
     */
    public constructor(parent: JQuery, rightId: number, rightKey: string, label: string, hint: string) {
        this._rightId = rightId;
        this._rightKey = rightKey;
        this._searchText = `${rightKey} ${label} ${hint}`.toLowerCase();

        RoleRightEntry._idCounter++;
        const inputId = `mwpa-role-right-${RoleRightEntry._idCounter}`;

        this._element = jQuery('<div class="form-check mb-2"/>').appendTo(parent);

        this._input = jQuery<HTMLInputElement>('<input class="form-check-input" type="checkbox">')
        .attr('id', inputId)
        .appendTo(this._element);

        const labelEl = jQuery('<label class="form-check-label d-block"/>')
        .attr('for', inputId)
        .appendTo(this._element);

        jQuery('<span class="fw-semibold"/>').text(label).appendTo(labelEl);
        jQuery('<code class="ms-2 small text-body-secondary"/>').text(rightKey).appendTo(labelEl);

        if (hint !== '') {
            jQuery('<span class="d-block small text-body-secondary"/>').text(hint).appendTo(labelEl);
        }

        this._input.on('change', (): void => {
            if (!this._inherited) {
                this._checked = this._input.prop('checked') === true;
            }
        });
    }

    /**
     * Register a change listener (called after the stored state was updated).
     * @param {(checked: boolean) => void} onChange
     */
    public setOnChange(onChange: (checked: boolean) => void): void {
        this._input.on('change', (): void => {
            onChange(this._checked);
        });
    }

    /**
     * Return the right id
     * @return {number}
     */
    public getRightId(): number {
        return this._rightId;
    }

    /**
     * Return the right key
     * @return {string}
     */
    public getRightKey(): string {
        return this._rightKey;
    }

    /**
     * Lower-cased text used by the filter (key + translated label + hint).
     * @return {string}
     */
    public getSearchText(): string {
        return this._searchText;
    }

    /**
     * Set the stored grant.
     * @param {boolean} checked
     */
    public setChecked(checked: boolean): void {
        this._checked = checked;
        this._render();
    }

    /**
     * Return the stored grant (what is saved).
     * @return {boolean}
     */
    public getChecked(): boolean {
        return this._checked;
    }

    /**
     * Show the row as granted by its area's full-access right (ticked and
     * locked) — the stored grant stays untouched.
     * @param {boolean} inherited
     */
    public setInherited(inherited: boolean): void {
        this._inherited = inherited;
        this._render();
    }

    /**
     * Show / hide the row
     * @param {boolean} visible
     */
    public setVisible(visible: boolean): void {
        this._element.toggleClass('d-none', !visible);
    }

    /**
     * Sync the checkbox with the stored + inherited state.
     * @protected
     */
    protected _render(): void {
        this._input.prop('checked', this._inherited || this._checked);
        this._input.prop('disabled', this._inherited);
        this._element.attr('title', this._inherited ? Lang.i().l('Granted by full access of this area.') : '');
    }

}