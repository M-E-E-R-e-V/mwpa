import {
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    ModalDialog,
    ModalDialogType,
    SelectBottemBorderOnly2
} from 'bambooo';
import {SpeciesGroupEntry} from '../../Api/SpeciesGroup';

/**
 * SpeciesEditModalButtonClickFn
 */
type SpeciesEditModalButtonClickFn = () => void;

/**
 * SpeciesEditModal
 */
export class SpeciesEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: InputBottemBorderOnly2;

    /**
     * Input ott id
     * @protected
     */
    protected _ottId: InputBottemBorderOnly2;

    /**
     * Select species group
     * @protected
     */
    protected _selectSpeciesGroup: SelectBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: SpeciesEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'speciesmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Specie-Name');
        this._inputName = new InputBottemBorderOnly2(groupName);
        this._inputName.setPlaceholder('Name of specie');

        const groupOttId = new FormGroup(bodyCard, 'Ott-Id');
        this._ottId = new InputBottemBorderOnly2(groupOttId, 'ottid', InputType.number);

        const groupSpeciesGroup = new FormGroup(bodyCard, 'Specie-Group');
        this._selectSpeciesGroup = new SelectBottemBorderOnly2(groupSpeciesGroup);

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public setName(name: string): void {
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
    public resetValues(): void {
        this.setId(null);
        this.setName('');
        this.setSpeciesGroup(0);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: SpeciesEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}