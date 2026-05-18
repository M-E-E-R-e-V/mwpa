import {
    ComponentType,
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType,
    Switch,
    Textarea
} from 'bambooo';

/**
 * Edit modal for one `encounter_categories` row.
 *
 * Exposes the soft-delete switch so admins can revive a previously
 * deleted row directly here — separating the kill-switch into a
 * dedicated endpoint would create the same UX-asymmetry we already
 * had on Vehicle.
 */
export class EncounterCategoriesEditModal extends ModalDialog {

    protected _id: number|null = null;
    protected _inputName: InputBottemBorderOnly2;
    protected _textareaDescription: Textarea;
    protected _switchDeleted: Switch;

    public constructor(elementObject: ComponentType) {
        super(elementObject, `encountercatmodal-${Date.now()}`, ModalDialogType.large);

        const body = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(body, new LangText('Name'));
        this._inputName = new InputBottemBorderOnly2(groupName, undefined, InputType.text);

        const groupDescription = new FormGroup(body, new LangText('Description'));
        this._textareaDescription = new Textarea(groupDescription);

        const groupDeleted = new FormGroup(body, new LangText('Deleted'));
        this._switchDeleted = new Switch(groupDeleted, 'encounterDeleted');

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save'), true);
    }

    public getId(): number|null {
        return this._id;
    }

    public setId(id: number|null): void {
        this._id = id;
    }

    public override resetValues(): void {
        this._id = null;
        this._inputName.setValue('');
        this._textareaDescription.setValue('');
        this._switchDeleted.setEnable(false);
    }

    public getName(): string {
        return this._inputName.getValue().trim();
    }

    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    public getDescription(): string {
        return this._textareaDescription.getValue();
    }

    public setDescription(description: string): void {
        this._textareaDescription.setValue(description);
    }

    public getIsDeleted(): boolean {
        return this._switchDeleted.isEnable();
    }

    public setIsDeleted(deleted: boolean): void {
        this._switchDeleted.setEnable(deleted);
    }

}