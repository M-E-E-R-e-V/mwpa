import {
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    IconFa,
    LangTextV2,
    SortingColumn2,
    SortOrder2,
    Table2,
    TableWrapper2,
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
import {AdminListUi} from '../Widget/AdminListUi';
import {BasePage} from './BasePage';
import {OrganizationEditModal} from './Organization/OrganizationEditModal';
import {OrganizationTrackingAreaModal} from './Organization/OrganizationTrackingAreaModal';

/**
 * Sortable columns
 */
type SortKey = 'id' | 'name' | 'location';

/**
 * Sort state per column
 */
type SortState = Record<SortKey, SortOrder2>;

/**
 * Organization admin page. Same look as the species / vehicle lists (see
 * {@link AdminListUi}): search, summary figures (home position, contact,
 * AROC data), and per organization the location, home position with map
 * link, contact links and the AROC authorization — missing data is
 * flagged, since the AROC report and the coast lines depend on it.
 */
export class Organization extends BasePage {

    /**
     * Rows per TableWrapper page
     * @protected
     */
    protected static readonly _PAGE_SIZE = 30;

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

            const name = this._orgModal.getName().trim();

            if (name === '') {
                this._toast.fire({
                    icon: 'error',
                    title: Lang.i().l('Name is required.')
                });
                return;
            }

            try {
                const orgEntry: OrganizationFullEntry = {
                    id: tid,
                    description: name,
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
                        title: Lang.i().l('Organization save success.')
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
     * Parsed home position, null when unset / invalid / 0,0.
     * @param {OrganizationFullEntry} org
     * @return {{lat: number; lon: number;}|null}
     * @protected
     */
    protected static _position(org: OrganizationFullEntry): {lat: number; lon: number;} | null {
        const lat = parseFloat(org.lat);
        const lon = parseFloat(org.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
            return null;
        }

        return {lat, lon};
    }

    /**
     * True when the AROC authorization is filled in.
     * @param {OrganizationFullEntry} org
     * @return {boolean}
     * @protected
     */
    protected static _hasAroc(org: OrganizationFullEntry): boolean {
        return org.aroc_reference.trim() !== '';
    }

    /**
     * True when there is a contact (e-mail or web).
     * @param {OrganizationFullEntry} org
     * @return {boolean}
     * @protected
     */
    protected static _hasContact(org: OrganizationFullEntry): boolean {
        return org.email.trim() !== '' || org.web.trim() !== '';
    }

    /**
     * Open the edit dialog.
     * @param {OrganizationFullEntry} org
     * @protected
     */
    protected _openEdit(org: OrganizationFullEntry): void {
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
    }

    /**
     * Open the tracking area dialog.
     * @param {OrganizationFullEntry} org
     * @protected
     */
    protected async _openTrackingArea(org: OrganizationFullEntry): Promise<void> {
        this._orgTrackingAreaModal.resetValues();
        this._orgTrackingAreaModal.setTitle(`${Lang.i().l('Tracking Area')}: ${org.description}`);
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

        const lang = Lang.i();

        const content = this._wrapper.getContentWrapper().getContent();
        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Organization'}));

        let searchTerm = '';
        let allOrgs: OrganizationFullEntry[] = [];
        let filteredOrgs: OrganizationFullEntry[] = [];

        // assigned below, used by the toolbar + sort handlers
        let applyFilter: (() => void) | null = null;

        // toolbar -----------------------------------------------------------------------------------------------------

        const toolbar = AdminListUi.toolbar(card.getElement());

        AdminListUi.search(toolbar, 'Search name, location, contact or id …', (term): void => {
            searchTerm = term;
            applyFilter?.();
        });

        const resultInfo = AdminListUi.resultInfo(toolbar);
        const stats = AdminListUi.statsRow(card.getElement());

        // table -------------------------------------------------------------------------------------------------------

        const sort: SortState = {
            id: SortOrder2.NONE,
            name: SortOrder2.ASC,
            location: SortOrder2.NONE
        };

        const tableWrapper = new TableWrapper2<OrganizationFullEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getElement());
        const emptyInfo = AdminListUi.emptyInfo(card.getElement(), 'No organizations match the current filter.');
        const table = tableWrapper.getTable();
        table.getElement().addClass('table-hover align-middle mb-0');
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        const sortRegistry: {key: SortKey; column: LangTextV2;}[] = [];

        const makeSortColumn = (label: string, key: SortKey): LangTextV2 => {
            const column = new LangTextV2({
                text: label,
                onClick: (element): void => {
                    const newValue = SortingColumn2.changeSort(element, sort[key]);

                    for (const other of sortRegistry) {
                        if (other.key !== key) {
                            sort[other.key] = SortOrder2.NONE;
                            SortingColumn2.initSort(other.column, SortOrder2.NONE);
                        }
                    }

                    sort[key] = newValue as SortOrder2;
                    applyFilter?.();
                }
            });

            SortingColumn2.initSort(column, sort[key]);
            sortRegistry.push({key, column});
            return column;
        };

        const thIcon = new Th2({value: ''});
        thIcon.appendTo(trhead);
        thIcon.getElement().css('width', '56px');
        new Th2({value: makeSortColumn('Organization', 'name')}).appendTo(trhead);
        new Th2({value: makeSortColumn('Location', 'location')}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Home position'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Contact'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'AROC'})}).appendTo(trhead);
        new Th2({value: makeSortColumn('Id', 'id')}).appendTo(trhead);
        const thAction = new Th2({value: ''});
        thAction.appendTo(trhead);
        thAction.getElement().css('width', '96px');

        const renderRow = (_table: Table2, org: OrganizationFullEntry): void => {
            const term = searchTerm;
            const tr = new Tr2();
            tr.appendTo(table.getTbody());

            // icon
            const tdIcon = new Td2({value: ''});
            tdIcon.appendTo(tr);
            const icon = jQuery('<div class="rounded-circle d-flex align-items-center justify-content-center bg-primary-subtle text-primary-emphasis"/>')
            .css({width: '36px', height: '36px'})
            .appendTo(tdIcon.getElement());
            jQuery('<i class="fas fa-building"/>').appendTo(icon);

            // name (click → edit)
            const tdName = new Td2({value: ''});
            tdName.appendTo(tr);
            AdminListUi.nameLink(tdName.getElement(), AdminListUi.highlight(org.description, term), (): void => {
                this._openEdit(org);
            });

            // location: place, island / province, country
            const tdLocation = new Td2({value: ''});
            tdLocation.appendTo(tr);
            const place = [org.location, org.island, org.province].map((p) => p.trim()).filter((p) => p !== '');

            if (place.length === 0 && org.country.trim() === '') {
                jQuery('<span class="small text-body-tertiary"/>').text('—').appendTo(tdLocation.getElement());
            } else {
                const line = jQuery('<div/>').appendTo(tdLocation.getElement());

                if (org.country.trim() !== '') {
                    jQuery('<span class="badge text-bg-light border me-2 font-monospace"/>').text(org.country.trim().toUpperCase()).appendTo(line);
                }

                jQuery('<span/>').html(AdminListUi.highlight(place[0] ?? '', term)).appendTo(line);

                if (place.length > 1) {
                    jQuery('<div class="small text-body-secondary"/>').html(AdminListUi.highlight(place.slice(1).join(', '), term)).appendTo(tdLocation.getElement());
                }

                if (org.port.trim() !== '') {
                    const port = jQuery('<div class="small text-body-secondary"/>').appendTo(tdLocation.getElement());
                    jQuery('<i class="fas fa-anchor me-1"/>').appendTo(port);
                    jQuery('<span/>').text(org.port.trim()).appendTo(port);
                }
            }

            // home position
            const tdPosition = new Td2({value: ''});
            tdPosition.appendTo(tr);
            const pos = Organization._position(org);

            if (pos === null) {
                AdminListUi.pill(tdPosition.getElement(), 'No home position', 'warning', 'fas fa-exclamation-triangle');
            } else {
                const link = jQuery<HTMLAnchorElement>('<a target="_blank" rel="noopener noreferrer" class="text-decoration-none small font-monospace"/>')
                .attr('href', `https://www.openstreetmap.org/?mlat=${pos.lat}&mlon=${pos.lon}#map=12/${pos.lat}/${pos.lon}`)
                .attr('title', lang.l('Show on OpenStreetMap'))
                .appendTo(tdPosition.getElement());
                jQuery('<i class="fas fa-map-marker-alt me-1"/>').appendTo(link);
                jQuery('<span/>').text(`${pos.lat.toFixed(5)}°, ${pos.lon.toFixed(5)}°`).appendTo(link);
            }

            // contact
            const tdContact = new Td2({value: ''});
            tdContact.appendTo(tr);

            if (Organization._hasContact(org)) {
                if (org.email.trim() !== '') {
                    const mail = jQuery<HTMLAnchorElement>('<a class="d-block small text-decoration-none"/>')
                    .attr('href', `mailto:${org.email.trim()}`)
                    .appendTo(tdContact.getElement());
                    jQuery('<i class="fas fa-envelope me-1"/>').appendTo(mail);
                    jQuery('<span/>').html(AdminListUi.highlight(org.email.trim(), term)).appendTo(mail);
                }

                const web = org.web.trim();

                if (web !== '') {
                    const href = (/^https?:\/\//iu).test(web) ? web : `https://${web}`;
                    const site = jQuery<HTMLAnchorElement>('<a target="_blank" rel="noopener noreferrer" class="d-block small text-decoration-none"/>')
                    .attr('href', href)
                    .appendTo(tdContact.getElement());
                    jQuery('<i class="fas fa-globe me-1"/>').appendTo(site);
                    jQuery('<span/>').html(AdminListUi.highlight(web.replace(/^https?:\/\//iu, '').replace(/\/$/u, ''), term)).appendTo(site);
                }
            } else {
                AdminListUi.pill(tdContact.getElement(), 'No contact', 'warning', 'fas fa-exclamation-triangle');
            }

            // AROC
            const tdAroc = new Td2({value: ''});
            tdAroc.appendTo(tr);

            if (Organization._hasAroc(org)) {
                jQuery('<div class="small font-monospace"/>').html(AdminListUi.highlight(org.aroc_reference.trim(), term)).appendTo(tdAroc.getElement());

                const details: string[] = [];

                if (org.aroc_region.trim() !== '') {
                    details.push(`${lang.l('Region')} ${org.aroc_region.trim()}`);
                }

                if (org.aroc_number.trim() !== '') {
                    details.push(`${lang.l('No.')} ${org.aroc_number.trim()}`);
                }

                if (org.aroc_authorized_boats > 0) {
                    details.push(`${org.aroc_authorized_boats} ${lang.l('authorized boats')}`);
                }

                if (details.length > 0) {
                    jQuery('<div class="small text-body-secondary"/>').text(details.join(' · ')).appendTo(tdAroc.getElement());
                }
            } else {
                AdminListUi.pill(tdAroc.getElement(), 'No AROC data', 'secondary', 'fas fa-file-alt');
            }

            // id
            const tdId = new Td2({value: ''});
            tdId.appendTo(tr);
            jQuery('<span class="font-monospace small text-body-secondary"/>').text(`#${org.id}`).appendTo(tdId.getElement());

            // actions
            const tdAction = new Td2({value: ''});
            tdAction.appendTo(tr);
            const actions = AdminListUi.actions(tdAction.getElement(), (): void => {
                this._openEdit(org);
            });

            const btnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            btnMenu.appendTo(actions);

            btnMenu.addMenuItem(lang.l('Tracking Area'), (): void => {
                this._openTrackingArea(org).then();
            }, 'fas fa-draw-polygon');

            Lang.i().lAll();
        };

        // filter + sort -----------------------------------------------------------------------------------------------

        const sortValue = (o: OrganizationFullEntry, key: SortKey): string | number => {
            switch (key) {
                case 'id':
                    return o.id;

                case 'name':
                    return o.description.toLowerCase();

                case 'location':
                    return `${o.country} ${o.location}`.toLowerCase();
            }

            return 0;
        };

        const matches = (o: OrganizationFullEntry): boolean => {
            const term = searchTerm.toLowerCase();

            if (term === '') {
                return true;
            }

            return [
                o.description,
                o.location,
                o.island,
                o.province,
                o.port,
                o.country,
                o.email,
                o.web,
                o.aroc_reference,
                `${o.id}`
            ].some((value) => value.toLowerCase().includes(term));
        };

        applyFilter = (): void => {
            filteredOrgs = allOrgs.filter(matches);

            const activeKey = (Object.keys(sort) as SortKey[]).find((k) => sort[k] !== SortOrder2.NONE);

            if (activeKey) {
                const dir = sort[activeKey] === SortOrder2.DESC ? -1 : 1;

                filteredOrgs.sort((a, b) => {
                    const av = sortValue(a, activeKey);
                    const bv = sortValue(b, activeKey);

                    if (av < bv) {
                        return -1 * dir;
                    }

                    if (av > bv) {
                        return Number(dir);
                    }

                    return 0;
                });
            }

            AdminListUi.setResult(resultInfo, filteredOrgs.length, allOrgs.length);
            AdminListUi.setEmpty(emptyInfo, filteredOrgs.length === 0);

            tableWrapper.reset().then();
        };

        const renderStats = (): void => {
            stats.empty();

            const total = allOrgs.length;
            const tile = (icon: string, value: number, label: string): void => {
                AdminListUi.stat(stats, icon, `${value} / ${total}`, label, value === total ? 'text-success' : 'text-warning');
            };

            AdminListUi.stat(stats, 'fas fa-building', `${total}`, 'Organizations', 'text-primary');
            tile('fas fa-map-marker-alt', allOrgs.filter((o) => Organization._position(o) !== null).length, 'with home position');
            tile('fas fa-envelope', allOrgs.filter((o) => Organization._hasContact(o)).length, 'with contact');
            tile('fas fa-file-alt', allOrgs.filter((o) => Organization._hasAroc(o)).length, 'with AROC data');
        };

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();

            try {
                allOrgs = await OrganizationAPI.getOrganizations() ?? [];
                card.setTitle(`${lang.l('Organization')} (${allOrgs.length})`);

                renderStats();
                applyFilter?.();
            } finally {
                card.hideLoading();
                Lang.i().lAll();
            }
        };

        tableWrapper.setDataSource(
            async(page) => {
                const offset = page * Organization._PAGE_SIZE;
                return filteredOrgs.slice(offset, offset + Organization._PAGE_SIZE);
            },
            renderRow,
            false
        );

        // load table
        this._onLoadTable();
    }

}