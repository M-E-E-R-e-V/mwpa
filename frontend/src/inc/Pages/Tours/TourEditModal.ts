import {ModalDialog2, ModalDialogType2} from 'bambooo';

/**
 * TourEditModal
 */
export class TourEditModal extends ModalDialog2 {

    /**
     * constructor
     */
    public constructor() {
        super({id: 'tourmodaldialog', modalType: ModalDialogType2.large});
    }

}