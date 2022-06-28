import {Element} from '../../PageComponents/Element';
import {ModalDialog, ModalDialogType} from '../../PageComponents/Modal/ModalDialog';

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