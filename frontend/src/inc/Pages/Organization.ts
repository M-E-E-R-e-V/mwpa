import {
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    IconFa,
    LangTextV2,
    Table2,
    Td2,
    Th2,
    Tr2
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

        this._orgModal = new OrganizationEditModal();

        this._orgTrackingAreaModal = new OrganizationTrackingAreaModal();

        // save --------------------------------------------------------------------------------------------------------

        this._orgTrackingAreaModal.setOnSave(async(): Promise<void> => {
            let tid = this._orgTrackingAreaModal.getTrackingAreaId();

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
                        title: Lang.i().l('Area save success.')
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
            let tid = this._orgModal.getOrganizationId();

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
                    lon: this._orgModal.getLon(),
                    province: this._orgModal.getProvince(),
                    island: this._orgModal.getIsland(),
                    port: this._orgModal.getPort(),
                    email: this._orgModal.getEmail(),
                    web: this._orgModal.getWeb(),
                    aroc_reference: this._orgModal.getArocReference(),
                    aroc_region: this._orgModal.getArocRegion(),
                    aroc_number: this._orgModal.getArocNumber(),
                    aroc_authorized_boats: this._orgModal.getArocAuthorizedBoats()
                };

                if (await OrganizationAPI.saveOrganization(orgEntry)) {
                    this._orgModal.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: Lang.i().l('Area save success.')
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
        this.addNavbarButton('Add Organization', 'fas fa-plus', () => {
            this._orgModal.resetValues();
            this._orgModal.setTitle(new LangTextV2({text: 'Add new Organization'}));
            this._orgModal.show();
        });

        this._onLoadTable = async(): Promise<void> => {
            const content = this._wrapper.getContentWrapper().getContent();
            content.empty();

            const row1 = new ContentRow2(content.getContentFluidElement());
            const card = new Card2({});
            card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());

            card.setTitle(new LangTextV2({text: 'Organization'}));
            card.showLoading();

            const orgs = await OrganizationAPI.getOrganizations();

            const table = new Table2({});
            table.appendTo(card.getElement());

            const trhead = new Tr2();
            trhead.appendTo(table.getThead());

            new Th2({value: new LangTextV2({text: 'Id'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Name'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Country'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Location'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Lon'})}).appendTo(trhead);
            new Th2({value: new LangTextV2({text: 'Lat'})}).appendTo(trhead);
            new Th2({value: Lang.i().l('Action')}).appendTo(trhead);

            if (orgs) {
                for (const org of orgs) {
                    const trbody = new Tr2();
                    trbody.appendTo(table.getTbody());

                    new Td2({value: `#${org.id}`}).appendTo(trbody);
                    new Td2({value: `${org.description}`}).appendTo(trbody);
                    new Td2({value: `${org.country}`}).appendTo(trbody);
                    new Td2({value: `${org.location}`}).appendTo(trbody);
                    new Td2({value: `${org.lon}`}).appendTo(trbody);
                    new Td2({value: `${org.lat}`}).appendTo(trbody);

                    const tdAction = new Td2({value: ''});
                    tdAction.appendTo(trbody);

                    const btnRMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
                    btnRMenu.appendTo(tdAction);

                    btnRMenu.addMenuItem(Lang.i().l('Edit'), async(): Promise<void> => {
                        this._orgModal.resetValues();
                        this._orgModal.setTitle(new LangTextV2({text: 'Edit Organization'}));
                        this._orgModal.setOrganizationId(org.id);
                        this._orgModal.setName(org.description);
                        this._orgModal.setCountry(org.country);
                        this._orgModal.setLocation(org.location);
                        this._orgModal.setLon(org.lon);
                        this._orgModal.setLat(org.lat);
                        this._orgModal.setProvince(org.province);
                        this._orgModal.setIsland(org.island);
                        this._orgModal.setPort(org.port);
                        this._orgModal.setEmail(org.email);
                        this._orgModal.setWeb(org.web);
                        this._orgModal.setArocReference(org.aroc_reference);
                        this._orgModal.setArocRegion(org.aroc_region);
                        this._orgModal.setArocNumber(org.aroc_number);
                        this._orgModal.setArocAuthorizedBoats(org.aroc_authorized_boats);
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
                                this._orgTrackingAreaModal.setTrackingAreaId(ta.id);
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