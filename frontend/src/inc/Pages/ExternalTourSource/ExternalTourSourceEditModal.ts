import {Lang} from '../../Lang';
import {
    FormGroup2,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2,
    Select2,
    Switch2
} from 'bambooo';
import {OrganizationFullEntry} from '../../Api/Organization';

/**
 * Edit modal for one organization_external_tour_source row.
 *
 * Fields are kept text-based because providers other than FareHarbor
 * may want different shapes — `item_pks` is a comma-separated string
 * in the UI and the page splits/joins on save.
 *
 * `provider` is a Select today restricted to the providers we have
 * a class for; widening it later is a matter of adding entries
 * (and the corresponding backend provider class).
 */
export class ExternalTourSourceEditModal extends ModalDialog2 {

    protected _id: number|null = null;

    protected _selectOrganization: Select2;
    protected _selectProvider: Select2;
    protected _inputBaseUrl: Input2;
    protected _inputCompanyShortname: Input2;
    protected _inputItemPks: Input2;
    protected _switchEnabled: Switch2;

    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupOrg = new FormGroup2({label: new LangTextV2({text: 'Organization'})});
        groupOrg.appendTo(body);
        this._selectOrganization = new Select2({});
        this._selectOrganization.appendTo(groupOrg);

        const groupProvider = new FormGroup2({label: new LangTextV2({text: 'Provider'})});
        groupProvider.appendTo(body);
        this._selectProvider = new Select2({});
        this._selectProvider.appendTo(groupProvider);
        this._selectProvider.setValues([{key: 'fareharbor', value: 'FareHarbor'}]);
        this._selectProvider.setSelectedValue('fareharbor');

        const groupBaseUrl = new FormGroup2({label: new LangTextV2({text: 'Base URL'})});
        groupBaseUrl.appendTo(body);
        this._inputBaseUrl = new Input2({type: InputType2.text});
        this._inputBaseUrl.appendTo(groupBaseUrl);
        this._inputBaseUrl.setPlaceholder('https://fareharbor.com/api/v1');
        this._inputBaseUrl.setValue('https://fareharbor.com/api/v1');

        const groupShortname = new FormGroup2({label: new LangTextV2({text: 'Company shortname'})});
        groupShortname.appendTo(body);
        this._inputCompanyShortname = new Input2({type: InputType2.text});
        this._inputCompanyShortname.appendTo(groupShortname);
        this._inputCompanyShortname.setPlaceholder('whalewatching-gomera');

        const groupItemPks = new FormGroup2({label: new LangTextV2({text: 'Item ids (comma-separated; empty = all)'})});
        groupItemPks.appendTo(body);
        this._inputItemPks = new Input2({type: InputType2.text});
        this._inputItemPks.appendTo(groupItemPks);
        this._inputItemPks.setPlaceholder('326313, 326315');

        const groupEnabled = new FormGroup2({label: new LangTextV2({text: 'Enabled'})});
        groupEnabled.appendTo(body);
        this._switchEnabled = new Switch2({});
        this._switchEnabled.appendTo(groupEnabled);
        this._switchEnabled.setEnable(true);

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save'), true);
    }

    public getSourceId(): number|null {
        return this._id;
    }

    public setSourceId(id: number|null): void {
        this._id = id;
    }

    public override resetValues(): void {
        this._id = null;
        this._selectOrganization.setSelectedValue('');
        this._selectProvider.setSelectedValue('fareharbor');
        this._inputBaseUrl.setValue('https://fareharbor.com/api/v1');
        this._inputCompanyShortname.setValue('');
        this._inputItemPks.setValue('');
        this._switchEnabled.setEnable(true);
    }

    public setOrganizationList(list: OrganizationFullEntry[]): void {
        this._selectOrganization.clearValues();
        this._selectOrganization.setValues([
            {key: '', value: '— select organisation —'},
            ...list.map((o) => ({key: `${o.id}`, value: o.description}))
        ]);
        this._selectOrganization.setSelectedValue('');
    }

    public getOrganization(): number {
        return parseInt(this._selectOrganization.getSelectedValue() || '0', 10);
    }

    public setOrganization(id: number): void {
        this._selectOrganization.setSelectedValue(`${id}`);
    }

    public getProvider(): string {
        return this._selectProvider.getSelectedValue() || 'fareharbor';
    }

    public setProvider(provider: string): void {
        this._selectProvider.setSelectedValue(provider || 'fareharbor');
    }

    public getBaseUrl(): string {
        return this._inputBaseUrl.getValue().trim();
    }

    public setBaseUrl(url: string): void {
        this._inputBaseUrl.setValue(url);
    }

    public getCompanyShortname(): string {
        return this._inputCompanyShortname.getValue().trim();
    }

    public setCompanyShortname(name: string): void {
        this._inputCompanyShortname.setValue(name);
    }

    public getItemPks(): string[] {
        const raw = this._inputItemPks.getValue();
        return raw.split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
    }

    public setItemPks(pks: string[]): void {
        this._inputItemPks.setValue(pks.join(', '));
    }

    public getEnabled(): boolean {
        return this._switchEnabled.isEnable();
    }

    public setEnabled(enabled: boolean): void {
        this._switchEnabled.setEnable(enabled);
    }

}