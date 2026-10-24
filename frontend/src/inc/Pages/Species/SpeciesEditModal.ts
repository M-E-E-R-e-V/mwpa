/* global JQuery */
import {
    FormGroup2,
    Input2,
    InputType2,
    ModalDialog2,
    ModalDialogType2,
    Select2
} from 'bambooo';
import {SpeciesGroupEntry} from '../../Api/SpeciesGroup';

/**
 * SpeciesEditModal
 */
export class SpeciesEditModal extends ModalDialog2 {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: Input2;

    /**
     * Input ott id
     * @protected
     */
    protected _ottId: Input2;

    /**
     * Input WoRMS aphia id
     * @protected
     */
    protected _aphiaId: Input2;

    /**
     * Anchor element that links to the marinespecies.org page for the
     * currently-entered aphia id. Hidden when the input is empty/0.
     * @protected
     */
    protected _aphiaLink: JQuery;

    /**
     * Select species group
     * @protected
     */
    protected _selectSpeciesGroup: Select2;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupName = new FormGroup2({label: 'Specie-Name'});
        groupName.appendTo(bodyCard);
        this._inputName = new Input2({});
        this._inputName.appendTo(groupName);
        this._inputName.setPlaceholder('Name of specie');

        const groupOttId = new FormGroup2({label: 'Ott-Id'});
        groupOttId.appendTo(bodyCard);
        this._ottId = new Input2({type: InputType2.number});
        this._ottId.appendTo(groupOttId);

        const groupAphiaId = new FormGroup2({label: 'WoRMS aphia-ID'});
        groupAphiaId.appendTo(bodyCard);
        this._aphiaId = new Input2({type: InputType2.number});
        this._aphiaId.appendTo(groupAphiaId);
        this._aphiaLink = jQuery('<small class="form-text"><a href="#" target="_blank" rel="noopener noreferrer">Open on marinespecies.org</a></small>')
        .hide()
        .appendTo(groupAphiaId.getElement());
        this._aphiaId.getElement().on('input change', () => {
            this._updateAphiaLink();
        });

        const groupSpeciesGroup = new FormGroup2({label: 'Specie-Group'});
        groupSpeciesGroup.appendTo(bodyCard);
        this._selectSpeciesGroup = new Select2({});
        this._selectSpeciesGroup.appendTo(groupSpeciesGroup);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose('Close');
        this.addButtonSave('Save changes', true);
    }

    /**
     * getId
     */
    public getSpecieId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setSpecieId(id: number|null): void {
        this._id = id;
    }

    /**
     * getName
     */
    public override getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public override setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Set the Ott ID
     * @param {number} id
     */
    public setOttId(id: number): void {
        this._ottId.setValue(`${id}`);
    }

    /**
     * Return the Ott ID
     * @returns {number}
     */
    public getOttId(): number {
        return parseInt(this._ottId.getValue(), 10) || 0;
    }

    /**
     * Set the WoRMS aphia ID
     * @param {number} id
     */
    public setAphiaId(id: number): void {
        this._aphiaId.setValue(id === 0 ? '' : `${id}`);
        this._updateAphiaLink();
    }

    /**
     * Return the WoRMS aphia ID
     * @returns {number}
     */
    public getAphiaId(): number {
        return parseInt(this._aphiaId.getValue(), 10) || 0;
    }

    /**
     * Show/hide the marinespecies.org link based on the current aphia id.
     * @protected
     */
    protected _updateAphiaLink(): void {
        const id = this.getAphiaId();
        if (id > 0) {
            this._aphiaLink
            .find('a')
            .attr('href', `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${id}`);
            this._aphiaLink.show();
        } else {
            this._aphiaLink.hide();
        }
    }

    /**
     * Set species group list
     * @param {SpeciesGroupEntry[]} groups
     */
    public setSpeciesGroupList(groups: SpeciesGroupEntry[]): void {
        this._selectSpeciesGroup.clearValues();

        for (const group of groups) {
            this._selectSpeciesGroup.addValue({
                key: `${group.id}`,
                value: group.name
            });
        }
    }

    /**
     * Set the species group
     * @param {number} speciesGroupId
     */
    public setSpeciesGroup(speciesGroupId: number): void {
        this._selectSpeciesGroup.setSelectedValue(`${speciesGroupId}`);
    }

    /**
     * Return the species group
     * @returns {number}
     */
    public getSpeciesGroup(): number {
        return parseInt(this._selectSpeciesGroup.getSelectedValue(), 10) || 0;
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setSpecieId(null);
        this.setName('');
        this.setOttId(0);
        this.setAphiaId(0);
        this.setSpeciesGroup(0);
    }

}