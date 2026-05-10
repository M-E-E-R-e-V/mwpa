import {
    ComponentType,
    FormGroup,
    InputBottemBorderOnly2,
    LangText,
    ModalDialog,
    ModalDialogType
} from 'bambooo';

/**
 * Modal for renaming a role. Roles cannot be created/deleted from the UI —
 * the catalog is seeded from ACLRbac constants on backend boot.
 */
export class RoleEditModal extends ModalDialog {

    protected _id: number = 0;

    protected _inputName: InputBottemBorderOnly2;

    public constructor(elementObject: ComponentType) {
        super(elementObject, `rolemodal-${Date.now()}`, ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Name');
        this._inputName = new InputBottemBorderOnly2(groupName);

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    public setId(id: number): void {
        this._id = id;
    }

    public getId(): number {
        return this._id;
    }

    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    public getName(): string {
        return this._inputName.getValue();
    }

    public override resetValues(): void {
        this._id = 0;
        this.setName('');
    }

}