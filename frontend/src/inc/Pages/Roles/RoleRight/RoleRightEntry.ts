import {CheckBox2, ICollectionEntryWidget2, Td2, Tr2} from 'bambooo';
import {RightEntry} from '../../../Api/Acl';
import {RoleRightListWidget} from './RoleRightListWidget';

/**
 * One right row in the role-rights table (v2). Carries the right id + raw key
 * (for filtering) and an access checkbox; the visible icon/label is set via
 * {@link setDisplay}.
 */
export class RoleRightEntry extends Tr2 implements ICollectionEntryWidget2 {

    protected _tdName: Td2;

    protected _readonly: boolean = false;

    protected _checkAccess: CheckBox2;

    protected _rightId: number = 0;

    protected _rightKey: string = '';

    protected _searchText: string = '';

    /**
     * Constructor
     * @param {RoleRightListWidget} element
     */
    public constructor(element: RoleRightListWidget) {
        super();

        this.appendTo(element.getTable().getTbody());

        this._tdName = new Td2({});
        this._tdName.appendTo(this);

        const tdCA = new Td2({});
        tdCA.appendTo(this);
        this._checkAccess = new CheckBox2({});
        this._checkAccess.appendTo(tdCA);
    }

    /**
     * Set read only
     * @param {boolean} readonly
     */
    public setReadOnly(readonly: boolean): void {
        this._readonly = readonly;
        this._checkAccess.setReadOnly(readonly);
    }

    /**
     * Is read only
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readonly;
    }

    /**
     * Remove
     */
    public remove(): void {
        this._element.remove();
    }

    /**
     * Keep id + raw key (for filtering). Label/icon set via setDisplay().
     * @param {RightEntry} right
     */
    public setRight(right: RightEntry): void {
        this._rightId = right.id;
        this._rightKey = right.key;
    }

    /**
     * Configure the visible row: icon, label, search text, optional indent.
     * @param {string} iconClasses
     * @param {string} label
     * @param {string} searchText
     * @param {boolean} indent
     */
    public setDisplay(iconClasses: string, label: string, searchText: string, indent: boolean = false): void {
        this._searchText = searchText.toLowerCase();

        const padding = indent ? 'padding-left: 36px;' : 'padding-left: 12px;';
        const td = this._tdName.getElement();

        td.empty();
        td.attr('style', padding);
        td.append(
            `<i class="${iconClasses} mr-2" style="width: 18px; text-align: center;"></i>` +
            `<span>${label}</span>`
        );
    }

    /**
     * Return the raw right key
     * @return {string}
     */
    public getRightKey(): string {
        return this._rightKey;
    }

    /**
     * Return the lower-cased combined search text
     * @return {string}
     */
    public getSearchText(): string {
        return this._searchText;
    }

    /**
     * Show / hide the row
     * @param {boolean} visible
     */
    public setVisible(visible: boolean): void {
        if (visible) {
            this._element.show();
        } else {
            this._element.hide();
        }
    }

    /**
     * Return the right id
     * @return {number}
     */
    public getRightId(): number {
        return this._rightId;
    }

    /**
     * Set checked
     * @param {boolean} checked
     */
    public setChecked(checked: boolean): void {
        this._checkAccess.setChecked(checked);
    }

    /**
     * Return the checked access
     * @return {boolean}
     */
    public getChecked(): boolean {
        return this._checkAccess.isChecked();
    }

}