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
 * Edit which rights a role has (v2). Renders the rights grouped by where they
 * take effect (basic access / working area / master data / administration)
 * via {@link RoleRightListWidget}, with a filter field on top.
 */
export class RoleRightsEditModal extends ModalDialog2 {

    protected _roleRightList: RoleRightListWidget;

    protected _searchInput: Input2;

    /**
     * Constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        jQuery('<p class="text-body-secondary mb-2"/>')
        .text(Lang.i().l('Tick the rights this role should grant. The hint below each right shows where it takes effect.'))
        .appendTo(body);

        const note = jQuery('<div class="alert alert-info py-2 small mb-3"/>').appendTo(body);
        jQuery('<i class="fas fa-info-circle me-2"/>').appendTo(note);
        jQuery('<span/>')
        .text(Lang.i().l('Normal users only need the working area (e.g. "Sightings: Read") — species, vehicles, encounters and organizations are then shown automatically. The master-data rights only open the Admin pages.'))
        .appendTo(note);

        // filter field
        const searchWrapper = jQuery('<div class="mb-3"/>').appendTo(body);
        this._searchInput = new Input2({type: InputType2.text});
        this._searchInput.appendTo(searchWrapper);
        this._searchInput.setPlaceholder(Lang.i().l('Filter rights …'));

        let searchTimer: ReturnType<typeof setTimeout> | null = null;
        this._searchInput.getElement().on('keyup', (): void => {
            if (searchTimer !== null) {
                clearTimeout(searchTimer);
            }

            searchTimer = setTimeout((): void => {
                this._roleRightList.filterByName(this._searchInput.getValue());
            }, 150);
        });

        // scrollable grouped rights list
        const listWrapper = jQuery('<div class="border rounded" style="max-height:60vh;overflow-y:auto;"/>').appendTo(body);

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
     * Return all rights with their stored state.
     * @return {RoleRightEntry[]}
     */
    public getRoleRights(): RoleRightEntry[] {
        return this._roleRightList.getRoleRights();
    }

}