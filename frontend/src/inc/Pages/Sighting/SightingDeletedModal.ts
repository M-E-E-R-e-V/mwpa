import {FormGroup2, FormRow2, LangTextV2, ModalDialog2, ModalDialogType2, Textarea2} from 'bambooo';

/**
 * Sighting deleted modal dialog.
 */
export class SightingDeletedModal extends ModalDialog2 {

    /**
     * ID of entry.
     * @member {number|null}
     */
    protected _sightingId: number|null = null;

    /**
     * Description, why a user deletes this sighting.
     * @member {Textarea2}
     */
    protected _descriptionArea: Textarea2;

    /**
     * Constructor from Dialog.
     */
    public constructor() {
        super({id: 'sightingdeletemodaldialog', modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const rowFirst = new FormRow2({});
        rowFirst.appendTo(bodyCard);
        const groupDesc = new FormGroup2({
            label: new LangTextV2({text: 'Are you sure you want to delete the sighting? Please describe:'})
        });
        groupDesc.appendTo(rowFirst.createCol(6));
        this._descriptionArea = new Textarea2({});
        this._descriptionArea.appendTo(groupDesc);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose('Close');
        this.addButtonSave('Save changes', true);
    }

    /**
     * getSightingId
     */
    public getSightingId(): number|null {
        return this._sightingId;
    }

    /**
     * Set the ID of entry.
     * @param {number|null} id - ID of entry.
     */
    public setSightingId(id: number|null): void {
        this._sightingId = id;
    }

    /**
     * Return the description by textarea input.
     * @returns {string}
     */
    public getDescription(): string {
        return this._descriptionArea.getValue();
    }

    /**
     * Set the description to textarea.
     * @param {string} description
     */
    public setDescription(description: string): void {
        this._descriptionArea.setValue(description);
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setSightingId(null);
        this.setDescription('');
    }

}