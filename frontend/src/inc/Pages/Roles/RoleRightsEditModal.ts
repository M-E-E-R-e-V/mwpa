/* global JQuery */
import {
    ComponentType,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType
} from 'bambooo';
import {RightEntry, RoleRightEntry} from '../../Api/Acl';

/**
 * Edit which rights a role has. Renders a scrollable, searchable list of
 * checkboxes — one per known right key. Groups visually by the leading
 * underscore-separated segment (e.g. `users_*`, `sightings_*`).
 */
export class RoleRightsEditModal extends ModalDialog {

    protected _roleId: number = 0;

    protected _searchInput: InputBottemBorderOnly2;

    protected _list: JQuery<HTMLDivElement>;

    /**
     * Map right_id → checkbox node (the source of truth for getRoleRights()).
     */
    protected _checkboxes: Map<number, JQuery<HTMLInputElement>> = new Map();

    /**
     * Map right_id → row container (used to hide non-matches when filtering).
     */
    protected _rows: Map<number, JQuery<HTMLDivElement>> = new Map();

    /**
     * The full catalog last passed in (so we can re-render when role changes).
     */
    protected _allRights: RightEntry[] = [];

    public constructor(elementObject: ComponentType) {
        super(elementObject, `rolerightsmodal-${Date.now()}`, ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        jQuery(
            '<h5 class="mb-2 text-primary"><i class="fas fa-shield-alt mr-2"></i>Rights</h5>'
        ).appendTo(bodyCard);

        jQuery('<p class="text-muted mb-3">Tick the rights this role should grant.</p>').appendTo(bodyCard);

        const searchWrapper = jQuery('<div class="mb-3"/>').appendTo(bodyCard);
        this._searchInput = new InputBottemBorderOnly2(searchWrapper, undefined, InputType.text);
        this._searchInput.setPlaceholder('Filter rights …');

        let searchTimer: ReturnType<typeof setTimeout> | null = null;
        this._searchInput.getElement().on('keyup', () => {
            if (searchTimer !== null) {
                clearTimeout(searchTimer);
            }
            searchTimer = setTimeout(() => {
                this._applyFilter(this._searchInput.getValue().trim().toLowerCase());
            }, 150);
        });

        this._list = jQuery<HTMLDivElement>(
            '<div style="max-height: 60vh; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px;"/>'
        ).appendTo(bodyCard);

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    public setRoleId(id: number): void {
        this._roleId = id;
    }

    public getRoleId(): number {
        return this._roleId;
    }

    /**
     * Render the catalog of available rights. Called once per modal-open.
     */
    public setRights(rights: RightEntry[]): void {
        this._allRights = rights.slice().sort((a, b) => a.key.localeCompare(b.key));
        this._renderList();
    }

    /**
     * Apply the current grants to the rendered checkboxes.
     */
    public setRoleRights(entries: RoleRightEntry[]): void {
        const granted = new Map(entries.map((e) => [e.right_id, e.hasRight]));
        for (const [rightId, cb] of this._checkboxes) {
            cb.prop('checked', granted.get(rightId) === true);
        }
    }

    /**
     * Collect every right with hasRight=true|false (the wire format the backend
     * expects for /json/role_rights/save).
     */
    public getRoleRights(): RoleRightEntry[] {
        const out: RoleRightEntry[] = [];
        for (const [rightId, cb] of this._checkboxes) {
            out.push({right_id: rightId, hasRight: cb.prop('checked') === true});
        }
        return out;
    }

    public override resetValues(): void {
        this._roleId = 0;
        this._allRights = [];
        this._checkboxes.clear();
        this._rows.clear();
        this._list.empty();
        this._searchInput.setValue('');
    }

    protected _renderList(): void {
        this._list.empty();
        this._checkboxes.clear();
        this._rows.clear();

        let lastGroup: string | null = null;

        for (const right of this._allRights) {
            const group = right.key.split('_')[0];
            if (group !== lastGroup) {
                jQuery(`<div class="font-weight-bold text-secondary mt-2 mb-1" style="border-bottom:1px solid #eee;">${group}</div>`)
                .appendTo(this._list);
                lastGroup = group;
            }

            const row = jQuery<HTMLDivElement>('<div class="form-check"/>').appendTo(this._list);
            const cbId = `rrcb-${this._roleId}-${right.id}`;
            const checkbox = jQuery<HTMLInputElement>(
                `<input type="checkbox" class="form-check-input" id="${cbId}"/>`
            ).appendTo(row);
            jQuery(`<label class="form-check-label" for="${cbId}">${right.key}</label>`).appendTo(row);

            this._checkboxes.set(right.id, checkbox);
            this._rows.set(right.id, row);
        }
    }

    protected _applyFilter(term: string): void {
        for (const right of this._allRights) {
            const row = this._rows.get(right.id);
            if (row) {
                const visible = term === '' || right.key.toLowerCase().includes(term);
                row.toggle(visible);
            }
        }
    }

}