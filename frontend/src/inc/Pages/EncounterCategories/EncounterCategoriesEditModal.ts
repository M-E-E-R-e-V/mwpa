import {
    FormGroup2,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2,
    Switch2,
    Textarea2
} from 'bambooo';

/**
 * Edit modal for one `encounter_categories` row.
 *
 * Exposes the soft-delete switch so admins can revive a previously
 * deleted row directly here — separating the kill-switch into a
 * dedicated endpoint would create the same UX-asymmetry we already
 * had on Vehicle.
 */
export class EncounterCategoriesEditModal extends ModalDialog2 {

    protected _id: number|null = null;
    protected _inputName: Input2;
    protected _textareaDescription: Textarea2;
    protected _switchDeleted: Switch2;

    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupName = new FormGroup2({label: new LangTextV2({text: 'Name'})});
        groupName.appendTo(body);
        this._inputName = new Input2({type: InputType2.text});
        this._inputName.appendTo(groupName);

        const groupDescription = new FormGroup2({label: new LangTextV2({text: 'Description'})});
        groupDescription.appendTo(body);
        this._textareaDescription = new Textarea2({});
        this._textareaDescription.appendTo(groupDescription);

        const groupDeleted = new FormGroup2({label: new LangTextV2({text: 'Deleted'})});
        groupDeleted.appendTo(body);
        this._switchDeleted = new Switch2({});
        this._switchDeleted.appendTo(groupDeleted);

        this.addButtonClose('Close');
        this.addButtonSave('Save', true);
    }

    public getEntryId(): number|null {
        return this._id;
    }

    public setEntryId(id: number|null): void {
        this._id = id;
    }

    public override resetValues(): void {
        this._id = null;
        this._inputName.setValue('');
        this._textareaDescription.setValue('');
        this._switchDeleted.setEnable(false);
    }

    public override getName(): string {
        return this._inputName.getValue().trim();
    }

    public override setName(name: string): void {
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