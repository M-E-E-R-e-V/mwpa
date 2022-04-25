import {EncounterCategories as EncounterCategoriesAPI} from '../../Api/EncounterCategories';
import {Species as SpeciesAPI} from '../../Api/Species';
import {FormGroup} from '../../PageComponents/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../PageComponents/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2, SelectOption} from '../../PageComponents/Content/Form/SelectBottemBorderOnly2';
import {Element} from '../../PageComponents/Element';
import {ModalDialog, ModalDialogType} from '../../PageComponents/Modal/ModalDialog';

/**
 * SightingEditModal
 */
export class SightingEditModal extends ModalDialog {

    protected _specieSelect: SelectBottemBorderOnly2;
    protected _inputGroupSize: InputBottemBorderOnly2;
    protected _encounterSelect: SelectBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'sightingmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        // const groupDateTime = new FormGroup(bodyCard, 'Datetime');

        const groupSpecie = new FormGroup(bodyCard, 'Specie');
        this._specieSelect = new SelectBottemBorderOnly2(groupSpecie.getElement());

        SpeciesAPI.getList().then((rspecies) => {
            if (rspecies) {
                const species: SelectOption[] = [];

                for (const rspecie of rspecies) {
                    species.push({
                        key: `${rspecie.id}`,
                        value: rspecie.name
                    });
                }

                this._specieSelect.setValues(species);
            }
        });

        const groupGSize = new FormGroup(bodyCard, 'Group-Size');
        this._inputGroupSize = new InputBottemBorderOnly2(groupGSize.getElement(), undefined, InputType.number);

        const groupEncounter = new FormGroup(bodyCard, 'Encounter');
        this._encounterSelect = new SelectBottemBorderOnly2(groupEncounter.getElement());

        EncounterCategoriesAPI.getList().then((rencounters) => {
            if (rencounters) {
                const species: SelectOption[] = [];

                for (const rencounter of rencounters) {
                    species.push({
                        key: `${rencounter.id}`,
                        value: rencounter.name
                    });
                }

                this._encounterSelect.setValues(species);
            }
        });
    }

}