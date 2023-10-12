import {ModalDialog, ModalDialogType} from 'bambooo';

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