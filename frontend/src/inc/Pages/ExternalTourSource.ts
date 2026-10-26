import {
    Badge2,
    BadgeType2,
    ButtonClass2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    DialogConfirm2,
    IconFa,
    LangTextV2,
    ModalDialogType2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tr2
} from 'bambooo';
import moment from 'moment';
import {ExternalTourSource as ExternalTourSourceAPI, ExternalTourSourceEntry} from '../Api/ExternalTourSource';
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {ExternalTourSourceEditModal} from './ExternalTourSource/ExternalTourSourceEditModal';

const PAGE_SIZE = 30;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

/**
 * Admin page — manages `organization_external_tour_source` rows.
 * Each row tells the ExternalTourService where to pull planned tour
 * slots from for a given organisation (FareHarbor today).
 *
 * Last-pull staleness + last-error are shown inline so admins can
 * spot a broken config without tailing logs.
 */
export class ExternalTourSource extends BasePage {

    protected override _name: string = 'admin-external-tour-source';

    protected _dialog: ExternalTourSourceEditModal;

    protected _organizations: OrganizationFullEntry[] = [];

    public constructor() {
        super();

        this._dialog = new ExternalTourSourceEditModal();

        this._dialog.setOnSave(async(): Promise<void> => {
            const id = this._dialog.getSourceId();
            const orgId = this._dialog.getOrganization();

            if (orgId === 0) {
                this._toast.fire({icon: 'error', title: Lang.i().l('Please select an organisation.')});
                return;
            }

            const shortname = this._dialog.getCompanyShortname();
            if (shortname === '') {
                this._toast.fire({icon: 'error', title: Lang.i().l('Company shortname is required.')});
                return;
            }

            try {
                const entry: ExternalTourSourceEntry = {
                    id: id ?? 0,
                    organization_id: orgId,
                    provider: this._dialog.getProvider(),
                    base_url: this._dialog.getBaseUrl(),
                    company_shortname: shortname,
                    item_pks: this._dialog.getItemPks(),
                    enabled: this._dialog.getEnabled()
                };

                if (await ExternalTourSourceAPI.save(entry)) {
                    this._dialog.hide();
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }
                    this._toast.fire({icon: 'success', title: Lang.i().l('Source saved.')});
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    private async _refreshOrganizationList(): Promise<void> {
        const orgs = await OrganizationAPI.getOrganizations();
        this._organizations = orgs ?? [];
        this._dialog.setOrganizationList(this._organizations);
    }

    public override async loadContent(): Promise<void> {
        this.addNavbarButton('Add source', 'fas fa-plus', async() => {
            this._dialog.resetValues();
            this._dialog.setTitle(new LangTextV2({text: 'Add external tour source'}));
            await this._refreshOrganizationList();
            this._dialog.show();
        });

        const content = this._wrapper.getContentWrapper().getContent();
        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'External tour sources'}));

        let allSources: ExternalTourSourceEntry[] = [];
        let orgNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper2<ExternalTourSourceEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        new Th2({value: new LangTextV2({text: 'Id'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Organisation'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Provider / Company / Items'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Status'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Last pull'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Action'})}).appendTo(trhead);

        const renderRow = (_table: Table2, entry: ExternalTourSourceEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());

            new Td2({value: `#${entry.id}`}).appendTo(trbody);

            const orgName = orgNameById.get(entry.organization_id) ?? `#${entry.organization_id}`;
            new Td2({value: escapeHtml(orgName)}).appendTo(trbody);

            const itemPks = entry.item_pks.length === 0
                ? '<span class="text-muted">all items</span>'
                : escapeHtml(entry.item_pks.join(', '));
            new Td2({
                value: `<b>${escapeHtml(entry.provider)}</b>`
                    + `<br><span class="text-muted small">${escapeHtml(entry.company_shortname)}</span>`
                    + `<br><span class="small">${itemPks}</span>`
            }).appendTo(trbody);

            const tdStatus = new Td2({value: ''});
            tdStatus.appendTo(trbody);
            if (entry.enabled) {
                new Badge2({text: 'enabled', type: BadgeType2.success}).appendTo(tdStatus);
            } else {
                new Badge2({text: 'disabled', type: BadgeType2.secondary}).appendTo(tdStatus);
            }
            if (entry.last_error && entry.last_error !== '') {
                tdStatus.append('<br>');
                new Badge2({text: 'last pull failed', type: BadgeType2.danger}).appendTo(tdStatus);
                tdStatus.append(`<br><small class="text-danger">${escapeHtml(entry.last_error)}</small>`);
            }

            const tdLast = new Td2({value: ''});
            tdLast.appendTo(trbody);
            if (entry.last_full_pull_at && entry.last_full_pull_at > 0) {
                const when = moment(entry.last_full_pull_at * 1000);
                tdLast.append(`<b>${when.format('YYYY-MM-DD HH:mm:ss')}</b><br><small class="text-muted">${when.fromNow()}</small>`);
            } else {
                tdLast.append(`<span class="text-muted">${Lang.i().l('never')}</span>`);
            }

            const tdAction = new Td2({value: ''});
            tdAction.appendTo(trbody);
            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(tdAction);

            btnMenu.addMenuItem(Lang.i().l('Edit'), async(): Promise<void> => {
                this._dialog.resetValues();
                this._dialog.setTitle(new LangTextV2({text: 'Edit external tour source'}));
                this._dialog.setSourceId(entry.id);
                await this._refreshOrganizationList();
                this._dialog.setOrganization(entry.organization_id);
                this._dialog.setProvider(entry.provider);
                this._dialog.setBaseUrl(entry.base_url);
                this._dialog.setCompanyShortname(entry.company_shortname);
                this._dialog.setItemPks(entry.item_pks);
                this._dialog.setEnabled(entry.enabled);
                this._dialog.show();
            }, IconFa.edit);

            btnMenu.addDivider();

            btnMenu.addMenuItem(Lang.i().l('Delete'), (): void => {
                DialogConfirm2.confirm(
                    'dcDeleteExternalTourSource',
                    ModalDialogType2.large,
                    Lang.i().l('Delete external tour source'),
                    `${Lang.i().l('Delete this source config?')} ${Lang.i().l('Pulled external_tour rows remain in the database as a historical record.')}`,
                    async(_, dialog) => {
                        try {
                            if (await ExternalTourSourceAPI.delete({id: entry.id})) {
                                this._toast.fire({icon: 'success', title: Lang.i().l('Source deleted.')});
                            }
                        } catch (message) {
                            this._toast.fire({icon: 'error', title: message});
                        }
                        dialog.hide();
                        if (this._onLoadTable) {
                            this._onLoadTable();
                        }
                    },
                    undefined,
                    'Delete',
                    ButtonClass2.danger
                );
            }, IconFa.trash);

            Lang.i().lAll();
        };

        const buildPage = (page: number): ExternalTourSourceEntry[] => {
            const offset = page * PAGE_SIZE;
            return allSources.slice(offset, offset + PAGE_SIZE);
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            try {
                const [sources, orgs] = await Promise.all([
                    ExternalTourSourceAPI.getList(),
                    OrganizationAPI.getOrganizations()
                ]);

                allSources = sources;
                this._organizations = orgs ?? [];

                orgNameById = new Map<number, string>();
                for (const o of this._organizations) {
                    orgNameById.set(o.id, o.description);
                }

                await tableWrapper.reset();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => buildPage(page),
            renderRow,
            false
        );

        this._onLoadTable();
    }

}