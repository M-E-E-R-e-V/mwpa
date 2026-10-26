import {
    IBasePage2,
    IPageLoader2,
    LangTextV2,
    PageLoader2,
    PageSideMenuEntry2,
    UtilAvatarGenerator,
    UtilColor,
    UtilRedirect,
    UtilShorname
} from 'bambooo';
import {Login as LoginApi} from './Api/Login';
import {User as UserApi} from './Api/User';
import {PageSideMenuEntry} from './Base/PageSideMenuEntry';
import {Lang} from './Lang';
import {Nav} from './Nav';
import {Session} from './Session';
import {About as AboutPage} from './Pages/About';
import {Admin as AdminPage} from './Pages/Admin';
import {AisLiveMap as AisLiveMapPage} from './Pages/AisLiveMap';
import {BasePage} from './Pages/BasePage';
import {Blacklist as BlacklistPage} from './Pages/Blacklist';
import {CrossSpeciesAnalytics as CrossSpeciesAnalyticsPage} from './Pages/Species/CrossSpeciesAnalytics';
import {Devices as DevicesPage} from './Pages/Devices';
import {Earthquake as EarthquakePage} from './Pages/Earthquake';
import {EncounterCategories as EncounterCategoriesPage} from './Pages/EncounterCategories';
import {ExternalTourSource as ExternalTourSourcePage} from './Pages/ExternalTourSource';
import {Group as GroupPage} from './Pages/Group';
import {OceanFishingMap as OceanFishingMapPage} from './Pages/OceanFishingMap';
import {Organization as OrganizationPage} from './Pages/Organization';
import {OrphanTracks as OrphanTracksPage} from './Pages/OrphanTracks';
import {Profil} from './Pages/Profil';
import {QuickConnectModal} from './Pages/QuickConnect/QuickConnectModal';
import {Roles as RolesPage} from './Pages/Roles';
import {Services as ServicesPage} from './Pages/Services';
import {Sighting as SightingPage} from './Pages/Sighting';
import {Species as SpeciesPage} from './Pages/Species';
import {Tours as ToursPage} from './Pages/Tours';
import {ToursExternal as ToursExternalPage} from './Pages/ToursExternal';
import {Users as UsersPage} from './Pages/Users';
import {Vehicle as VehiclePage} from './Pages/Vehicle';
import {Lang_DE} from '../langs/Lang_DE';
import {Lang_EN} from '../langs/Lang_EN';
import {Lang_ES} from '../langs/Lang_ES';

/**
 * MWPA page loader — a thin facade over the bambooo v2 PageLoader (AdminLTE 4
 * shell). It configures the shared wrapper (navbar/sidebar/preloader), the
 * declarative ACL-gated side menu, language and the logged-in user, then
 * delegates page loading to the v2 loader. Replaces the old per-page v1 wrapper
 * built in index.ts.
 */
export class PageLoader {

    /**
     * Instance of the MWPA page loader facade
     * @private
     */
    // eslint-disable-next-line no-use-before-define
    private static _instance: PageLoader|null = null;

    /**
     * Return an instance from the page loader
     * @returns {PageLoader}
     */
    public static getInstance(): PageLoader {
        if (PageLoader._instance === null) {
            PageLoader._instance = new PageLoader();
        }

        return PageLoader._instance;
    }

    /**
     * TITLE
     * @private
     */
    private readonly TITLE: string = 'MWPA';

    /**
     * LOGO
     * @private
     */
    private readonly LOGO: string = 'images/whale-ico.png';

    /**
     * user page (opened when the sidebar user panel is clicked)
     * @protected
     */
    protected _userPage: new () => BasePage = Profil;

    /**
     * underlying bambooo v2 page loader
     * @protected
     */
    protected _loader: IPageLoader2;

    /**
     * Whether the current user + rights were already loaded
     * @protected
     */
    protected _userLoaded: boolean = false;

    /**
     * Whether the QuickConnect navbar button was already mounted (once).
     * @protected
     */
    protected _navbarExtrasBuilt: boolean = false;

    /**
     * The language (country code) currently rendered on the page. Used to
     * decide whether a navbar language click actually changes the language
     * (→ reload so the plain-text `l(...)` strings re-render too).
     * @protected
     */
    protected _appliedLang: string|null = null;

    /**
     * cached current user (for the sidebar panel)
     * @protected
     */
    protected _currentFullname: string|null = null;

    /**
     * cached current username (avatar color seed)
     * @protected
     */
    protected _currentUsername: string|null = null;

    /**
     * Side menu list. `aclRight` mirrors the per-route aclRight gating on the
     * backend; undefined = always visible. Admins resolve to the `root` role on
     * the backend (all rights), so Session.hasRight short-circuits for them.
     * @protected
     */
    protected _sideMenuList: PageSideMenuEntry[] = [
        {
            title: new LangTextV2({text: 'Tours'}),
            icon: 'fa-solid fa-flag',
            name: 'tours-group',
            aclRight: 'tours_read',
            items: [
                {
                    title: new LangTextV2({text: 'Tour list'}),
                    icon: 'fa-solid fa-list',
                    name: 'tours',
                    page: ToursPage,
                    aclRight: 'tours_read'
                },
                {
                    title: new LangTextV2({text: 'Tours External'}),
                    icon: 'fa-solid fa-calendar-alt',
                    name: 'tours-external',
                    page: ToursExternalPage,
                    aclRight: 'external_tours_read'
                },
                {
                    title: new LangTextV2({text: 'Orphan Tracks'}),
                    icon: 'fa-solid fa-unlink',
                    name: 'orphan-tracks',
                    page: OrphanTracksPage,
                    aclRight: 'tours_write'
                }
            ]
        },
        {
            title: new LangTextV2({text: 'Sighting'}),
            icon: 'fa-solid fa-binoculars',
            name: 'sighting',
            page: SightingPage,
            aclRight: 'sightings_read'
        },
        {
            title: new LangTextV2({text: 'Species comparison'}),
            icon: 'fa-solid fa-chart-line',
            name: 'cross-species-analytics',
            page: CrossSpeciesAnalyticsPage,
            aclRight: 'analytics_read'
        },
        {
            title: new LangTextV2({text: 'Ocean & Fishing'}),
            icon: 'fa-solid fa-water',
            name: 'ocean_fishing_map',
            page: OceanFishingMapPage,
            aclRight: 'sightings_read'
        },
        {
            title: new LangTextV2({text: 'Live AIS Map'}),
            icon: 'fa-solid fa-ship',
            name: 'ais-live-map',
            page: AisLiveMapPage,
            aclRight: 'ais_read'
        },
        {
            title: new LangTextV2({text: 'Earthquakes'}),
            icon: 'fa-solid fa-bolt',
            name: 'earthquakes',
            page: EarthquakePage,
            aclRight: 'earthquake_read'
        },
        {
            title: new LangTextV2({text: 'Admin'}),
            icon: 'fa-cogs',
            name: 'admin',
            page: AdminPage,
            items: [
                {
                    title: new LangTextV2({text: 'Users'}),
                    icon: 'fa-solid fa-users',
                    name: 'admin-users',
                    page: UsersPage,
                    aclRight: 'users_read'
                },
                {
                    title: new LangTextV2({text: 'User Groups'}),
                    icon: 'fa-solid fa-tags',
                    name: 'admin-user-groups',
                    page: GroupPage,
                    aclRight: 'groups_read'
                },
                {
                    title: new LangTextV2({text: 'Roles'}),
                    icon: 'fa-solid fa-user-shield',
                    name: 'admin-roles',
                    page: RolesPage,
                    aclRight: 'users_roles_read'
                },
                {
                    title: new LangTextV2({text: 'Organization'}),
                    icon: 'fa-solid fa-globe',
                    name: 'admin-organization',
                    page: OrganizationPage,
                    aclRight: 'organizations_read'
                },
                {
                    title: new LangTextV2({text: 'Species'}),
                    icon: 'fa-solid fa-paw',
                    name: 'admin-species',
                    page: SpeciesPage,
                    aclRight: 'species_read'
                },
                {
                    title: new LangTextV2({text: 'Vehicle'}),
                    icon: 'fa-solid fa-ship',
                    name: 'admin-vehicle',
                    page: VehiclePage,
                    aclRight: 'vehicles_read'
                },
                {
                    title: new LangTextV2({text: 'Encounters'}),
                    icon: 'fa-solid fa-satellite-dish',
                    name: 'admin-encounters',
                    page: EncounterCategoriesPage,
                    aclRight: 'catalog_read'
                },
                {
                    title: new LangTextV2({text: 'Devices'}),
                    icon: 'fa-solid fa-server',
                    name: 'admin-devices',
                    page: DevicesPage,
                    aclRight: 'devices_read'
                },
                {
                    title: new LangTextV2({text: 'External Tour Sources'}),
                    icon: 'fa-solid fa-calendar-alt',
                    name: 'admin-external-tour-source',
                    page: ExternalTourSourcePage,
                    aclRight: 'external_tours_read'
                },
                {
                    title: new LangTextV2({text: 'Services'}),
                    icon: 'fa-solid fa-cog',
                    name: 'admin-services',
                    page: ServicesPage,
                    aclRight: 'service'
                },
                {
                    title: new LangTextV2({text: 'Blacklist'}),
                    icon: 'fa-solid fa-ban',
                    name: 'admin-blacklist',
                    page: BlacklistPage,
                    aclRight: 'blacklist_read'
                }
            ]
        },
        {
            title: new LangTextV2({text: 'About'}),
            icon: 'fa-solid fa-circle-info',
            name: 'about',
            page: AboutPage
        }
    ];

    /**
     * Page loader constructor — wire the bambooo v2 loader.
     */
    public constructor() {
        Lang.i('Lang_EN');
        jQuery('#mwpa_page_title').html(Lang.i().l('title'));

        this._loader = PageLoader2.getInstance({
            title: this.TITLE,
            logo: this.LOGO,
            lang: {
                default: 'us',
                list: [new Lang_EN(), new Lang_DE(), new Lang_ES()]
            },
            navbar: {
                fullsize: true,
                logout: async(): Promise<void> => {
                    if (confirm('Logout?')) {
                        await LoginApi.logout();
                        UtilRedirect.toLogin('login.html');
                    }
                }
            },
            user: {
                onload: (): void => {
                    this._applyUserPanel();
                }
            },
            menu: this._buildMenu(this._sideMenuList),
            access: (right?: string): boolean => Session.hasRight(right)
        });

        /*
         * Wire the navigation mediator so pages can navigate without importing
         * this loader (which would re-create the PageLoader ↔ Pages cycle).
         */
        Nav.register((page: BasePage): Promise<boolean> => this.load(page));
    }

    /**
     * Map the MWPA side menu (page classes) onto bambooo v2 menu entries
     * (ref = page class, resolved on navigate).
     * @param {PageSideMenuEntry[]} entries
     * @protected
     * @returns {PageSideMenuEntry2<new () => IBasePage2>[]}
     */
    protected _buildMenu(entries: PageSideMenuEntry[]): PageSideMenuEntry2<new () => IBasePage2>[] {
        return entries.map((entry): PageSideMenuEntry2<new () => IBasePage2> => ({
            name: entry.name,
            title: entry.title,
            icon: entry.icon,
            aclRight: entry.aclRight,
            ref: entry.page as (new () => IBasePage2)|undefined,
            items: entry.items ? this._buildMenu(entry.items) : undefined
        }));
    }

    /**
     * Load the current user + rights once (before the first menu build).
     * @protected
     * @returns {Promise<boolean>} `false` when the user is not logged in (a
     * redirect to the login page has been triggered) — callers MUST abort and
     * not render/load the page.
     */
    protected async _ensureUser(): Promise<boolean> {
        if (this._userLoaded) {
            return true;
        }

        if (!await LoginApi.isLogin()) {
            UtilRedirect.toLogin('login.html');
            return false;
        }

        const currentuser = await UserApi.getUserInfo();

        Session.setUser(currentuser?.user);

        if (currentuser?.user) {
            this._currentFullname = currentuser.user.fullname;
            this._currentUsername = currentuser.user.username;
        }

        this._userLoaded = true;

        return true;
    }

    /**
     * Fill the sidebar user panel (avatar, name, click -> profile).
     * @protected
     */
    protected _applyUserPanel(): void {
        const mainSidebar = this._loader.getWrapper().getMainSidebar();

        if (!mainSidebar) {
            return;
        }

        const up = mainSidebar.getSidebar().getUserPanel();

        if (!up) {
            return;
        }

        if (this._currentFullname && this._currentUsername) {
            up.setImage(
                UtilAvatarGenerator.generateAvatar(
                    UtilShorname.getShortname(this._currentFullname),
                    'white',
                    UtilColor.getColor(this._currentUsername)
                )
            );

            up.setUsername(this._currentFullname);
        }

        up.setOnClickFn((): void => {
            this.load(new this._userPage()).then();
        });
    }

    /**
     * Load a page
     * @param {BasePage} page
     * @returns {Promise<boolean>}
     */
    public async load(page: BasePage): Promise<boolean> {
        /*
         * Not logged in: _ensureUser has triggered the login redirect. Abort
         * here so the page (and its API calls) never runs while anonymous.
         */
        if (!await this._ensureUser()) {
            return false;
        }

        /*
         * Set the persisted language as current BEFORE the page is built, so the
         * `Lang.i().l(...)` calls inside loadContent (e.g. the Sighting tabs)
         * render directly in the right language — those produce plain text, not
         * `lang="1"` elements, so a later lAll() cannot fix them.
         */
        this._applyStoredLang();

        const result = await this._loader.load(page);

        /*
         * The navbar exists once the shell is built — mount the QuickConnect
         * button (idempotent).
         */
        this._applyNavbarExtras();

        /*
         * Apply the persisted language to the freshly-rendered page. The v2
         * shell marks the stored language active on the flag but does not
         * reliably re-translate the page content on load — force it here (after
         * the page is built) so a reload keeps the selected language instead of
         * falling back to English.
         */
        this._applyStoredLang();

        return result;
    }

    /**
     * Apply the persisted language selection to the whole page: set it as the
     * current language and re-translate every marked element. No-op when nothing
     * is stored (first visit → default language).
     * @protected
     */
    protected _applyStoredLang(): void {
        const selected = Lang.getStoreLangSelect();
        this._appliedLang = selected ?? 'us';

        if (!selected) {
            return;
        }

        const pack = [new Lang_EN(), new Lang_DE(), new Lang_ES()]
        .find((p) => p.getCountryCode() === selected);

        if (pack) {
            Lang.i().setCurrentLang(pack);
        }

        Lang.i().lAll();
    }

    /**
     * Reload the page when the navbar language is switched, so the plain-text
     * `Lang.i().l(...)` strings (built once in loadContent — e.g. the Sighting
     * tabs) re-render in the new language too, not just the live-translated
     * `LangTextV2` elements. bambooo's own handler (store + lAll) runs first on
     * the same click; this fires on bubbling and reloads only on a real change.
     * Runs once.
     * @protected
     */
    protected _wireLanguageReload(): void {
        jQuery('body').off('click.mwpalang').on('click.mwpalang', 'a[id^="lang-"]', (ev): void => {
            const code = (jQuery(ev.currentTarget).attr('id') ?? '').replace('lang-', '');

            if (code !== '' && code !== this._appliedLang) {
                window.setTimeout(() => window.location.reload(), 30);
            }
        });
    }

    /**
     * Mount the QuickConnect (QR) button into the navbar (right side). Runs once.
     * @protected
     */
    protected _applyNavbarExtras(): void {
        if (this._navbarExtrasBuilt) {
            return;
        }

        const navbar = this._loader.getWrapper().getNavbar();

        if (!navbar) {
            return;
        }

        const item = jQuery('<li class="nav-item"/>');
        const link = jQuery('<a href="#" class="nav-link" role="button" aria-label="Quick Connect">' +
            '<i class="fas fa-qrcode"></i></a>');

        item.append(link);
        item.prependTo(navbar.getRightNavbar().getElement());

        link.on('click', (ev): void => {
            ev.preventDefault();

            const content = this._loader.getWrapper().getContentWrapper().getContent();
            const modal = new QuickConnectModal(content.getElement());
            modal.setOnHidden(async(): Promise<void> => {
                modal.destroy();
            });
            modal.open().then();
        });

        this._wireLanguageReload();

        this._navbarExtrasBuilt = true;
    }

    /**
     * Return the shared wrapper.
     * @returns {ReturnType<IPageLoader2['getWrapper']>}
     */
    public getWrapper(): ReturnType<IPageLoader2['getWrapper']> {
        return this._loader.getWrapper();
    }

}