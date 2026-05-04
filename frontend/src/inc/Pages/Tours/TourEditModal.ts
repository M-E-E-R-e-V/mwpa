import {ComponentType, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * TourEditModal
 */
export class TourEditModal extends ModalDialog {

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: ComponentType) {
        super(elementObject, 'tourmodaldialog', ModalDialogType.large);
    }

}