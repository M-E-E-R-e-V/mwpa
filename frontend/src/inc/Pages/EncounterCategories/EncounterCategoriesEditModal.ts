/* global JQuery */
import {Lang} from '../../Lang';
import {
    FormRow2,
    Input2,
    ModalDialog2,
    ModalDialogType2,
    Textarea2
} from 'bambooo';
import {FormLayout} from '../../Widget/FormLayout';

/**
 * Edit modal for one `encounter_categories` row (v2, {@link FormLayout}):
 * name + description (the description is the guideline the crew follows
 * when choosing the reaction of a sighting) and the soft-delete switch, so
 * admins can revive a previously deleted row directly here.
 */
export class EncounterCategoriesEditModal extends ModalDialog2 {

    protected _id: number|null = null;

    protected _inputName: Input2;

    protected _textareaDescription: Textarea2;

    protected _switchDeleted: JQuery<HTMLInputElement>;

    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        // general -----------------------------------------------------------------------------------------------------

        const general = FormLayout.section(
            body,
            'fas fa-exchange-alt',
            'General',
            'How the animals react to the boat. Chosen per sighting as "Reaction"; the description helps the crew to pick the right one.'
        );

        const rowName = new FormRow2({});
        rowName.appendTo(general);

        this._inputName = FormLayout.input(rowName.createCol(12), 'Name', {
            icon: 'fas fa-tag',
            placeholder: 'e.g. Proximity',
            required: true
        });

        const rowDescription = new FormRow2({});
        rowDescription.appendTo(general);

        this._textareaDescription = FormLayout.textarea(rowDescription.createCol(12), 'Description', {
            rows: 4,
            placeholder: 'What exactly is observed, e.g. distance to the boat, direction of movement …'
        });

        // status ------------------------------------------------------------------------------------------------------

        const status = FormLayout.section(body, 'fas fa-toggle-on', 'Status');

        this._switchDeleted = FormLayout.switch(
            status,
            'Deleted',
            'No longer offered for new sightings. Existing sightings keep their reaction; can be restored at any time.'
        );

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save'), true);
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
        this.setIsDeleted(false);
    }

    public override getName(): string {
        return this._inputName.getValue().trim();
    }

    public override setName(name: string): void {
        this._inputName.setValue(name);
    }

    public getDescription(): string {
        return this._textareaDescription.getValue().trim();
    }

    public setDescription(description: string): void {
        this._textareaDescription.setValue(description);
    }

    public getIsDeleted(): boolean {
        return this._switchDeleted.prop('checked') === true;
    }

    public setIsDeleted(deleted: boolean): void {
        this._switchDeleted.prop('checked', deleted);
    }

}