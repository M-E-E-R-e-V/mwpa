import {SpeciesEntry} from '../../Api/Species';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * SpeciesMergeModalButtonClickFn
 */
type SpeciesMergeModalButtonClickFn = () => void;

/**
 * SpeciesMergeModal
 */
export class SpeciesMergeModal extends ModalDialog {

    /**
     * specie source select
     * @protected
     */
    protected _specieSourceSelect: SelectBottemBorderOnly2;

    /**
     * specie destination select
     * @protected
     */
    protected _specieDestinationSelect: SelectBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: SpeciesMergeModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'speciesmergemodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupSrcSpecie = new FormGroup(bodyCard, 'Specie source');
        this._specieSourceSelect = new SelectBottemBorderOnly2(groupSrcSpecie);

        const groupDstSpecie = new FormGroup(bodyCard, 'Specie destination');
        this._specieDestinationSelect = new SelectBottemBorderOnly2(groupDstSpecie);

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });
    }

    /**
     * setSpecies
     * @param species
     */
    public setSpecies(species: SpeciesEntry[]) {
        this._specieSourceSelect.clearValues();
        this._specieDestinationSelect.clearValues();

        this._specieSourceSelect.addValue({
            key: '0',
            value: '*Please select a specie*',
        });

        this._specieDestinationSelect.addValue({
            key: '0',
            value: '*Please select a specie*',
        });

        for (const specie of species) {
            const toption = {
                key: `${specie.id}`,
                value: specie.name,
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
     * @param speciesId
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
    public resetValues(): void {
        this._specieSourceSelect.setSelectedValue('0');
        this._specieDestinationSelect.setSelectedValue('0');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: SpeciesMergeModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }
}