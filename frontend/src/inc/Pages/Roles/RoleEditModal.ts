import {Lang} from '../../Lang';
import {
    FormGroup2,
    Input2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2
} from 'bambooo';

/**
 * Create / rename a role (v2). System roles (root, user) can't be renamed —
 * the caller guards that; this dialog only edits the name.
 */
export class RoleEditModal extends ModalDialog2 {

    protected _id: number = 0;

    protected _inputName: Input2;

    /**
     * Constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        jQuery(
            '<h5 class="mb-3 text-primary"><i class="fas fa-user-tag mr-2"></i>Role</h5>'
        ).appendTo(bodyCard);

        const groupName = new FormGroup2({label: new LangTextV2({text: 'name'})});
        groupName.appendTo(bodyCard);
        this._inputName = new Input2({});
        this._inputName.appendTo(groupName);

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * Set id
     * @param {number} id
     */
    public setRoleId(id: number): void {
        this._id = id;
    }

    /**
     * Return id
     * @return {number}
     */
    public getRoleId(): number {
        return this._id;
    }

    /**
     * Set the name
     * @param {string} name
     */
    public override setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Return name
     * @return {string}
     */
    public override getName(): string {
        return this._inputName.getValue();
    }

    /**
     * Reset values
     */
    public override resetValues(): void {
        this.setRoleId(0);
        this.setName('');
    }

}