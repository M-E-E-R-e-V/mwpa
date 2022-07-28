import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * SpeciesEditModal
 */
export class SpeciesEditModal extends ModalDialog {

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'speciesmodaldialog', ModalDialogType.large);
    }
}