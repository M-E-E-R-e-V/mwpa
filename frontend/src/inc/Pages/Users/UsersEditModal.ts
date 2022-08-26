import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * UsersEditModalButtonClickFn
 */
type UsersEditModalButtonClickFn = () => void;

/**
 * UsersEditModal
 */
export class UsersEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input Username
     * @protected
     */
    protected _inputUsername: InputBottemBorderOnly2;

    /**
     * input Fullname
     * @protected
     */
    protected _inputFullname: InputBottemBorderOnly2;

    /**
     * input password
     * @protected
     */
    protected _inputPassword: InputBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: UsersEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'usersmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupUsername = new FormGroup(bodyCard, 'Username');
        this._inputUsername = new InputBottemBorderOnly2(groupUsername);
        this._inputUsername.setPlaceholder('Name of user');

        const groupFullname = new FormGroup(bodyCard, 'Fullname');
        this._inputFullname = new InputBottemBorderOnly2(groupFullname);
        this._inputFullname.setPlaceholder('Fullname of user');

        const groupPassword = new FormGroup(bodyCard, 'Password');
        this._inputPassword = new InputBottemBorderOnly2(groupPassword, undefined, InputType.password);
        this._inputPassword.setPlaceholder('');
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
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: UsersEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }
}