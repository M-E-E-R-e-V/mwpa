import {
    Badge,
    BadgeType,
    ButtonClass,
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    DialogConfirm,
    IconFa,
    LangText,
    LeftNavbarLink,
    ModalDialogType,
    Table,
    TableWrapper,
    Td,
    Th,
    Tr
} from 'bambooo';
import moment from 'moment';
import {ExternalTourSource as ExternalTourSourceAPI, ExternalTourSourceEntry} from '../Api/ExternalTourSource';
import {Organization as OrganizationAPI, OrganizationFullEntry} from '../Api/Organization';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {ExternalTourSourceEditModal} from './ExternalTourSource/ExternalTourSourceEditModal';

const PAGE_SIZE = 30;

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

        this._dialog = new ExternalTourSourceEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add source', async() => {
            this._dialog.resetValues();
            this._dialog.setTitle(new LangText('Add external tour source'));
            await this._refreshOrganizationList();
            this._dialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._dialog.setOnSave(async(): Promise<void> => {
            const id = this._dialog.getId();
            const orgId = this._dialog.getOrganization();

            if (orgId === 0) {
                this._toast.fire({icon: 'error', title: 'Please select an organisation.'});
                return;
            }

            const shortname = this._dialog.getCompanyShortname();
            if (shortname === '') {
                this._toast.fire({icon: 'error', title: 'Company shortname is required.'});
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
                    this._toast.fire({icon: 'success', title: 'Source saved.'});
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
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('External tour sources'));

        let allSources: ExternalTourSourceEntry[] = [];
        let orgNameById = new Map<number, string>();

        const tableWrapper = new TableWrapper<ExternalTourSourceEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Id'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Organisation'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Provider / Company / Items'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Status'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Last pull'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Action'));

        const renderRow = (_table: Table, entry: ExternalTourSourceEntry): void => {
            const trbody = new Tr(table.getTbody());

            // eslint-disable-next-line no-new
            new Td(trbody, `#${entry.id}`);

            const orgName = orgNameById.get(entry.organization_id) ?? `#${entry.organization_id}`;
            // eslint-disable-next-line no-new
            new Td(trbody, escapeHtml(orgName));

            const itemPks = entry.item_pks.length === 0
                ? '<span class="text-muted">all items</span>'
                : escapeHtml(entry.item_pks.join(', '));
            // eslint-disable-next-line no-new
            new Td(
                trbody,
                `<b>${escapeHtml(entry.provider)}</b>`
                + `<br><span class="text-muted small">${escapeHtml(entry.company_shortname)}</span>`
                + `<br><span class="small">${itemPks}</span>`
            );

            const tdStatus = new Td(trbody, '');
            if (entry.enabled) {
                // eslint-disable-next-line no-new
                new Badge(tdStatus, 'enabled', BadgeType.success);
            } else {
                // eslint-disable-next-line no-new
                new Badge(tdStatus, 'disabled', BadgeType.secondary);
            }
            if (entry.last_error && entry.last_error !== '') {
                tdStatus.append('<br>');
                // eslint-disable-next-line no-new
                new Badge(tdStatus, 'last pull failed', BadgeType.danger);
                tdStatus.append(`<br><small class="text-danger">${escapeHtml(entry.last_error)}</small>`);
            }

            const tdLast = new Td(trbody, '');
            if (entry.last_full_pull_at && entry.last_full_pull_at > 0) {
                const when = moment(entry.last_full_pull_at * 1000);
                tdLast.append(`<b>${when.format('YYYY-MM-DD HH:mm:ss')}</b><br><small class="text-muted">${when.fromNow()}</small>`);
            } else {
                tdLast.append('<span class="text-muted">never</span>');
            }

            const tdAction = new Td(trbody, '');
            const btnMenu = new ButtonMenu(tdAction.getElement(), IconFa.bars, true, ButtonType.borderless);

            btnMenu.addMenuItem('Edit', async(): Promise<void> => {
                this._dialog.resetValues();
                this._dialog.setTitle(new LangText('Edit external tour source'));
                this._dialog.setId(entry.id);
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

            btnMenu.addMenuItem('Delete', (): void => {
                DialogConfirm.confirm(
                    'dcDeleteExternalTourSource',
                    ModalDialogType.large,
                    'Delete external tour source',
                    'Delete this source config?'
                    + ' Pulled external_tour rows remain in the database as a historical record.',
                    async(_, dialog) => {
                        try {
                            if (await ExternalTourSourceAPI.delete({id: entry.id})) {
                                this._toast.fire({icon: 'success', title: 'Source deleted.'});
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
                    ButtonClass.danger
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