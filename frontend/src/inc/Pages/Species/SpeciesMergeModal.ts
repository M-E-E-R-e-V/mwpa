import {Lang} from '../../Lang';
import {
    FormGroup2,
    ModalDialog2,
    ModalDialogType2,
    Select2
} from 'bambooo';
import {SpeciesEntry} from '../../Api/Species';

/**
 * SpeciesMergeModal
 */
export class SpeciesMergeModal extends ModalDialog2 {

    /**
     * specie source select
     * @protected
     */
    protected _specieSourceSelect: Select2;

    /**
     * specie destination select
     * @protected
     */
    protected _specieDestinationSelect: Select2;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupSrcSpecie = new FormGroup2({label: Lang.i().l('Specie source')});
        groupSrcSpecie.appendTo(bodyCard);
        this._specieSourceSelect = new Select2({});
        this._specieSourceSelect.appendTo(groupSrcSpecie);

        const groupDstSpecie = new FormGroup2({label: Lang.i().l('Specie destination')});
        groupDstSpecie.appendTo(bodyCard);
        this._specieDestinationSelect = new Select2({});
        this._specieDestinationSelect.appendTo(groupDstSpecie);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * setSpecies
     * @param species
     */
    public setSpecies(species: SpeciesEntry[]): void {
        this._specieSourceSelect.clearValues();
        this._specieDestinationSelect.clearValues();

        this._specieSourceSelect.addValue({
            key: '0',
            value: '*Please select a specie*'
        });

        this._specieDestinationSelect.addValue({
            key: '0',
            value: '*Please select a specie*'
        });

        for (const specie of species) {
            const toption = {
                key: `${specie.id}`,
                value: `#${specie.id} - ${specie.name}`
            };

            this._specieSourceSelect.addValue(toption);
            this._specieDestinationSelect.addValue(toption);
        }
    }

    /**
     * setSourceSpecie
     * @param specieId
     */
    public setSourceSpecie(specieId: string): void {
        this._specieSourceSelect.setSelectedValue(specieId);
    }

    /**
     * getSourceSpecie
     */
    public getSourceSpecie(): string {
        return this._specieSourceSelect.getSelectedValue();
    }

    /**
     * setDestinationSpecie
     * @param {string} specieId
     */
    public setDestinationSpecie(specieId: string): void {
        this._specieDestinationSelect.setSelectedValue(specieId);
    }

    /**
     * getDestinationSpecie
     */
    public getDestinationSpecie(): string {
        return this._specieDestinationSelect.getSelectedValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this._specieSourceSelect.setSelectedValue('0');
        this._specieDestinationSelect.setSelectedValue('0');
    }

}