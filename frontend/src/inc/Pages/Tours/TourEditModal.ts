import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * TourEditModal
 */
export class TourEditModal extends ModalDialog {

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'tourmodaldialog', ModalDialogType.large);
    }

}