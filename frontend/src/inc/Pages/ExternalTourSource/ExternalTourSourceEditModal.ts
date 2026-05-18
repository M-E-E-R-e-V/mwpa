import {
    ComponentType,
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType,
    SelectBottemBorderOnly2,
    Switch
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
export class ExternalTourSourceEditModal extends ModalDialog {

    protected _id: number|null = null;

    protected _selectOrganization: SelectBottemBorderOnly2;
    protected _selectProvider: SelectBottemBorderOnly2;
    protected _inputBaseUrl: InputBottemBorderOnly2;
    protected _inputCompanyShortname: InputBottemBorderOnly2;
    protected _inputItemPks: InputBottemBorderOnly2;
    protected _switchEnabled: Switch;

    public constructor(elementObject: ComponentType) {
        super(elementObject, `externaltoursourcemodal-${Date.now()}`, ModalDialogType.large);

        const body = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupOrg = new FormGroup(body, new LangText('Organization'));
        this._selectOrganization = new SelectBottemBorderOnly2(groupOrg);

        const groupProvider = new FormGroup(body, new LangText('Provider'));
        this._selectProvider = new SelectBottemBorderOnly2(groupProvider);
        this._selectProvider.setValues([{key: 'fareharbor', value: 'FareHarbor'}]);
        this._selectProvider.setSelectedValue('fareharbor');

        const groupBaseUrl = new FormGroup(body, new LangText('Base URL'));
        this._inputBaseUrl = new InputBottemBorderOnly2(groupBaseUrl, undefined, InputType.text);
        this._inputBaseUrl.setPlaceholder('https://fareharbor.com/api/v1');
        this._inputBaseUrl.setValue('https://fareharbor.com/api/v1');

        const groupShortname = new FormGroup(body, new LangText('Company shortname'));
        this._inputCompanyShortname = new InputBottemBorderOnly2(groupShortname, undefined, InputType.text);
        this._inputCompanyShortname.setPlaceholder('whalewatching-gomera');

        const groupItemPks = new FormGroup(body, new LangText('Item ids (comma-separated; empty = all)'));
        this._inputItemPks = new InputBottemBorderOnly2(groupItemPks, undefined, InputType.text);
        this._inputItemPks.setPlaceholder('326313, 326315');

        const groupEnabled = new FormGroup(body, new LangText('Enabled'));
        this._switchEnabled = new Switch(groupEnabled, 'extToursourceEnabled');
        this._switchEnabled.setEnable(true);

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save'), true);
    }

    public getId(): number|null {
        return this._id;
    }

    public setId(id: number|null): void {
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