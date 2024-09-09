import {
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    LangText,
    LeftNavbarLink,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {
    Organization as OrganizationAPI,
    OrganizationFullEntry,
    OrganizationTrackingAreaEntry,
    TrackingAreaType
} from '../Api/Organization';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {OrganizationEditModal} from './Organization/OrganizationEditModal';
import {OrganizationTrackingAreaModal} from './Organization/OrganizationTrackingAreaModal';

/**
 * Organization
 */
export class Organization extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'admin-organization';

    /**
     * Organization modal
     * @protected
     */
    protected _orgModal: OrganizationEditModal;

    /**
     * Organization tracking area modal
     * @protected
     */
    protected _orgTrackingAreaModal: OrganizationTrackingAreaModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this._orgModal = new OrganizationEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        this._orgTrackingAreaModal = new OrganizationTrackingAreaModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Organization', () => {
            this._orgModal.resetValues();
            this._orgModal.setTitle('Add new Organization');
            this._orgModal.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // save --------------------------------------------------------------------------------------------------------

        this._orgTrackingAreaModal.setOnSave(async(): Promise<void> => {
            let tid = this._orgTrackingAreaModal.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const trackingEntry: OrganizationTrackingAreaEntry = {
                    id: tid,
                    organization_id: this._orgTrackingAreaModal.getOrgId() ?? 0,
                    area_type: TrackingAreaType.HOME,
                    geojsonstr: this._orgTrackingAreaModal.getGeoJsonStr()
                };

                if (await OrganizationAPI.saveOrganizationTrackingArea(trackingEntry)) {
                    this._orgTrackingAreaModal.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Area save success.'
                    });
                }
            } catch (message) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });

        this._orgModal.setOnSave(async(): Promise<void> => {
            let tid = this._orgModal.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const orgEntry: OrganizationFullEntry = {
                    id: tid,
                    description: this._orgModal.getName(),
                    country: this._orgModal.getCountry(),
                    location: this._orgModal.getLocation(),
                    lat: this._orgModal.getLat(),
                    lon: this._orgModal.getLon()
                };

                if (await OrganizationAPI.saveOrganization(orgEntry)) {
                    this._orgModal.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Area save success.'
                    });
                }
            } catch (message) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        this._onLoadTable = async(): Promise<void> => {
            this._wrapper.getContentWrapper().getContent().empty();

            const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
            const card = new Card(new ContentCol(row1, ContentColSize.col12));

            card.setTitle(new LangText('Organization'));
            card.showLoading();

            const orgs = await OrganizationAPI.getOrganizations();

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Id'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Name'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Country'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Location'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Lon'));

            // eslint-disable-next-line no-new
            new Th(trhead, new LangText('Lat'));

            // eslint-disable-next-line no-new
            new Th(trhead, 'Action');

            if (orgs) {
                for (const org of orgs) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${org.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${org.description}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${org.country}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${org.location}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${org.lon}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${org.lat}`);

                    const tdAction = new Td(trbody, '');

                    const btnRMenu = new ButtonMenu(
                        tdAction.getElement(),
                        IconFa.bars,
                        true,
                        ButtonType.borderless
                    );

                    btnRMenu.addMenuItem('Edit', async(): Promise<void> => {
                        this._orgModal.resetValues();
                        this._orgModal.setTitle('Edit Organization');
                        this._orgModal.setId(org.id);
                        this._orgModal.setName(org.description);
                        this._orgModal.setCountry(org.country);
                        this._orgModal.setLocation(org.location);
                        this._orgModal.setLon(org.lon);
                        this._orgModal.setLat(org.lat);
                        this._orgModal.show();
                    }, IconFa.edit);

                    btnRMenu.addMenuItem(
                        'Tracking Area',
                        async(): Promise<void> => {
                            this._orgTrackingAreaModal.resetValues();
                            this._orgTrackingAreaModal.setTitle(`Tracking Area: ${org.description}`);
                            this._orgTrackingAreaModal.setOrgId(org.id);
                            this._orgTrackingAreaModal.setOrganizationPosition(
                                parseFloat(org.lon),
                                parseFloat(org.lat)
                            );

                            const ta = await OrganizationAPI.getOrganizationTrackingArea({
                                organization_id: org.id,
                                area_type: TrackingAreaType.HOME
                            });

                            if (ta !== null) {
                                this._orgTrackingAreaModal.setId(ta.id);
                                this._orgTrackingAreaModal.setGeoJsonStr(ta.geojsonstr);
                            }

                            this._orgTrackingAreaModal.show();
                        },
                        IconFa.share
                    );
                }
            }

            card.hideLoading();
            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}