import {Lang} from '../../Lang';
import {
    Input2,
    InputType2,
    ModalDialog2,
    ModalDialogType2
} from 'bambooo';
import {RightEntry, RoleRightEntry} from '../../Api/Acl';
import {RoleRightListWidget} from './RoleRight/RoleRightListWidget';

/**
 * Edit which rights a role has (v2). Renders a searchable, grouped access
 * table (parent → sub-group → per-action rows) via {@link RoleRightListWidget}.
 */
export class RoleRightsEditModal extends ModalDialog2 {

    protected _roleRightList: RoleRightListWidget;

    protected _searchInput: Input2;

    /**
     * Constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        jQuery(
            '<h5 class="mb-2 text-primary"><i class="fas fa-shield-alt mr-2"></i>Rights</h5>'
        ).appendTo(bodyCard);

        jQuery('<p class="text-muted mb-3">Tick the rights this role should grant.</p>').appendTo(bodyCard);

        // search field
        const searchWrapper = jQuery('<div class="mb-3"/>').appendTo(bodyCard);
        this._searchInput = new Input2({type: InputType2.text});
        this._searchInput.appendTo(searchWrapper);
        this._searchInput.setPlaceholder(Lang.i().l('Filter rights …'));

        let searchTimer: ReturnType<typeof setTimeout> | null = null;
        this._searchInput.getElement().on('keyup', () => {
            if (searchTimer !== null) {
                clearTimeout(searchTimer);
            }
            searchTimer = setTimeout(() => {
                this._roleRightList.filterByName(this._searchInput.getValue());
            }, 150);
        });

        // scrollable grouped rights table
        const listWrapper = jQuery(
            '<div style="max-height:60vh;overflow-y:auto;border:1px solid #dee2e6;border-radius:4px;"/>'
        ).appendTo(bodyCard);

        this._roleRightList = new RoleRightListWidget(listWrapper);

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * Set role id
     * @param {number} id
     */
    public setRoleId(id: number): void {
        this._roleRightList.setRoleId(id);
    }

    /**
     * Return role id
     * @return {number}
     */
    public getRoleId(): number {
        return this._roleRightList.getRoleId();
    }

    /**
     * Set the catalog of available rights.
     * @param {RightEntry[]} rights
     */
    public setRights(rights: RightEntry[]): void {
        this._roleRightList.setRights(rights);
    }

    /**
     * Apply the role's current grants.
     * @param {RoleRightEntry[]} roleRights
     */
    public setRoleRights(roleRights: RoleRightEntry[]): void {
        this._roleRightList.setRoleRights(roleRights);
    }

    /**
     * Return all rights with their checked state.
     * @return {RoleRightEntry[]}
     */
    public getRoleRights(): RoleRightEntry[] {
        return this._roleRightList.getRoleRights();
    }

}