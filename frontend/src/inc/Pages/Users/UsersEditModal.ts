import {Lang} from '../../Lang';
import {
    FormGroup2,
    FormRow2,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2,
    Select2,
    Switch2
} from 'bambooo';
import {GroupEntry} from '../../Api/Group';

/**
 * UsersEditModal
 */
export class UsersEditModal extends ModalDialog2 {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input Username
     * @protected
     */
    protected _inputUsername: Input2;

    /**
     * input Fullname
     * @protected
     */
    protected _inputFullname: Input2;

    /**
     * input password
     * @protected
     */
    protected _inputPassword: Input2;

    /**
     * input password repeat
     * @protected
     */
    protected _inputPasswordRepeat: Input2;

    /**
     * input pin repeat
     * @protected
     */
    protected _inputPin: Input2;

    /**
     * input pin repeat
     * @protected
     */
    protected _inputPinRepeat: Input2;

    /**
     * input EMail
     * @protected
     */
    protected _inputEMail: Input2;

    /**
     * select main group
     * @protected
     */
    protected _selectMainGroup: Select2;

    /**
     * switch is admin
     * @protected
     */
    protected _switchIsAdmin: Switch2;

    /**
     * switch is disabled
     * @protected
     */
    protected _switchIsDisabled: Switch2;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupUsername = new FormGroup2({label: new LangTextV2({text: 'Username'})});
        groupUsername.appendTo(bodyCard);
        this._inputUsername = new Input2({});
        this._inputUsername.appendTo(groupUsername);
        this._inputUsername.setPlaceholder(Lang.i().l('Name of user'));

        const groupFullname = new FormGroup2({label: new LangTextV2({text: 'Fullname'})});
        groupFullname.appendTo(bodyCard);
        this._inputFullname = new Input2({});
        this._inputFullname.appendTo(groupFullname);
        this._inputFullname.setPlaceholder(Lang.i().l('Fullname of user'));

        const groupPassword = new FormGroup2({label: new LangTextV2({text: 'Password'})});
        groupPassword.appendTo(bodyCard);
        this._inputPassword = new Input2({type: InputType2.password});
        this._inputPassword.appendTo(groupPassword);
        this._inputPassword.setPlaceholder('');

        const groupPasswordRepeat = new FormGroup2({label: new LangTextV2({text: 'Password repeat'})});
        groupPasswordRepeat.appendTo(bodyCard);
        this._inputPasswordRepeat = new Input2({type: InputType2.password});
        this._inputPasswordRepeat.appendTo(groupPasswordRepeat);
        this._inputPasswordRepeat.setPlaceholder('');

        const groupPing = new FormGroup2({label: new LangTextV2({text: 'Pin'})});
        groupPing.appendTo(bodyCard);
        this._inputPin = new Input2({type: InputType2.password});
        this._inputPin.appendTo(groupPing);
        this._inputPin.setPlaceholder('');

        const groupPinRepeat = new FormGroup2({label: new LangTextV2({text: 'Pin repeat'})});
        groupPinRepeat.appendTo(bodyCard);
        this._inputPinRepeat = new Input2({type: InputType2.password});
        this._inputPinRepeat.appendTo(groupPinRepeat);
        this._inputPinRepeat.setPlaceholder('');

        const groupEMail = new FormGroup2({label: new LangTextV2({text: 'EMail'})});
        groupEMail.appendTo(bodyCard);
        this._inputEMail = new Input2({});
        this._inputEMail.appendTo(groupEMail);
        this._inputEMail.setPlaceholder('e@mail.org');

        const groupMainGroup = new FormGroup2({label: new LangTextV2({text: 'Main group'})});
        groupMainGroup.appendTo(bodyCard);
        this._selectMainGroup = new Select2({});
        this._selectMainGroup.appendTo(groupMainGroup);

        const rowOpt = new FormRow2({});
        rowOpt.appendTo(bodyCard);

        const groupIsAdmin = new FormGroup2({label: new LangTextV2({text: 'Is Admin'})});
        groupIsAdmin.appendTo(rowOpt.createCol(4));
        this._switchIsAdmin = new Switch2({});
        this._switchIsAdmin.appendTo(groupIsAdmin);

        const groupIsDisabled = new FormGroup2({label: new LangTextV2({text: 'Is Disabled'})});
        groupIsDisabled.appendTo(rowOpt.createCol(4));
        this._switchIsDisabled = new Switch2({});
        this._switchIsDisabled.appendTo(groupIsDisabled);

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * getUserId
     */
    public getUserId(): number|null {
        return this._id;
    }

    /**
     * setUserId
     * @param id
     */
    public setUserId(id: number|null): void {
        this._id = id;
    }

    /**
     * getUsername
     */
    public getUsername(): string {
        return this._inputUsername.getValue();
    }

    /**
     * setUsername
     * @param username
     */
    public setUsername(username: string): void {
        this._inputUsername.setValue(username);
    }

    /**
     * getFullname
     */
    public getFullname(): string {
        return this._inputFullname.getValue();
    }

    /**
     * setFullname
     * @param fullname
     */
    public setFullname(fullname: string): void {
        this._inputFullname.setValue(fullname);
    }

    /**
     * getPassword
     */
    public getPassword(): string {
        return this._inputPassword.getValue();
    }

    /**
     * setPassword
     * @param password
     */
    public setPassword(password: string): void {
        this._inputPassword.setValue(password);
    }

    /**
     * getPasswordRepeat
     */
    public getPasswordRepeat(): string {
        return this._inputPasswordRepeat.getValue();
    }

    /**
     * setPasswordRepeat
     * @param password
     */
    public setPasswordRepeat(password: string): void {
        this._inputPasswordRepeat.setValue(password);
    }

    /**
     * getPin
     */
    public getPin(): string {
        return this._inputPin.getValue();
    }

    public setPin(pin: string): void {
        this._inputPin.setValue(pin);
    }

    /**
     * getPinRepeat
     */
    public getPinRepeat(): string {
        return this._inputPinRepeat.getValue();
    }

    /**
     * setPinRepeat
     * @param pin
     */
    public setPinRepeat(pin: string): void {
        this._inputPinRepeat.setValue(pin);
    }

    /**
     * getEMail
     */
    public getEMail(): string {
        return this._inputEMail.getValue();
    }

    /**
     * setEMail
     * @param email
     */
    public setEMail(email: string): void {
        this._inputEMail.setValue(email);
    }

    /**
     * setMainGroupList
     * @param groups
     */
    public setMainGroupList(groups: GroupEntry[]): void {
        this._selectMainGroup.clearValues();

        for (const group of groups) {
            this._selectMainGroup.addValue({
                key: `${group.id}`,
                value: group.description
            });
        }
    }

    /**
     * getMainGroup
     */
    public getMainGroup(): number {
        return parseInt(this._selectMainGroup.getSelectedValue(), 10) || 0;
    }

    /**
     * setMainGroup
     * @param maingroup
     */
    public setMainGroup(maingroup: number): void {
        this._selectMainGroup.setSelectedValue(`${maingroup}`);
    }

    /**
     * setIsAdmin
     * @param isAdmin
     */
    public setIsAdmin(isAdmin: boolean): void {
        this._switchIsAdmin.setEnable(isAdmin);
    }

    /**
     * getIsAdmin
     */
    public getIsAdmin(): boolean {
        return this._switchIsAdmin.isEnable();
    }

    /**
     * setIsDisabled
     * @param isDisabled
     */
    public setIsDisabled(isDisabled: boolean): void {
        this._switchIsDisabled.setEnable(isDisabled);
    }

    /**
     * getIsDisabled
     */
    public getIsDisabled(): boolean {
        return this._switchIsDisabled.isEnable();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setUserId(null);
        this.setUsername('');
        this.setFullname('');
        this.setEMail('');
        this.setPassword('');
        this.setPasswordRepeat('');
        this.setPin('');
        this.setPinRepeat('');
        this.setMainGroup(0);
        this.setIsAdmin(false);
        this.setIsDisabled(false);
    }

}