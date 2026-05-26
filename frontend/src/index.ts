import {
    ChangeLangClickFn,
    LangText,
    NavbarLinkButton,
    NavbarLinkFullsize,
    NavbarLinkLanguage,
    SidebarMenuItem, SidebarMenuTree, UtilAvatarGenerator, UtilColor, UtilRedirect, UtilShorname
} from 'bambooo';
import {Login} from './inc/Api/Login';
import {User as UserAPI} from './inc/Api/User';
import {Lang} from './inc/Lang';
import {Admin as AdminPage} from './inc/Pages/Admin';
import {BasePage} from './inc/Pages/BasePage';
import {Devices as DevicesPage} from './inc/Pages/Devices';
import {Group as GroupPage} from './inc/Pages/Group';
import {OceanFishingMap as OceanFishingMapPage} from './inc/Pages/OceanFishingMap';
import {Organization} from './inc/Pages/Organization';
import {Profil} from './inc/Pages/Profil';
import {Roles as RolesPage} from './inc/Pages/Roles';
import {Sighting as SightingPage} from './inc/Pages/Sighting';
import {Species as SpeciesPage} from './inc/Pages/Species';
import {Earthquake as EarthquakePage} from './inc/Pages/Earthquake';
import {OrphanTracks as OrphanTracksPage} from './inc/Pages/OrphanTracks';
import {CrossSpeciesAnalytics as CrossSpeciesAnalyticsPage} from './inc/Pages/Species/CrossSpeciesAnalytics';
import {Tours as ToursPage} from './inc/Pages/Tours';
import {ToursExternal} from './inc/Pages/ToursExternal';
import {Users as UsersPage} from './inc/Pages/Users';
import {AisLiveMap} from './inc/Pages/AisLiveMap';
import {EncounterCategories} from './inc/Pages/EncounterCategories';
import {ExternalTourSource} from './inc/Pages/ExternalTourSource';
import {Services} from './inc/Pages/Services';
import {Vehicle} from './inc/Pages/Vehicle';
import {Lang_DE} from './langs/Lang_DE';
import {Lang_EN} from './langs/Lang_EN';
import {Lang_ES} from './langs/Lang_ES';

/**
 * SideMenuEntrySub
 */
type SideMenuEntrySub = {
    title: string;
    icon: string;
    name: string;
    onClick: (value: any) => void;
};

/**
 * SideMenuEntry
 */
type SideMenuEntry = {
    title: string;
    icon: string;
    name: string;
    onClick: (value: any) => void;
    items?: SideMenuEntrySub[];
};

/**
 * Main function for ready document
 */
(async(): Promise<void> => {
    Lang.i('Lang_EN');
    jQuery('#ccc_title').html(Lang.i().l('title'));

    let globalPage: BasePage|null = null;

    /**
     * loadPage
     * @param page
     */
    const loadPage = async(page: BasePage): Promise<void> => {
        page.setLoadPageFn(loadPage);

        const preloader = page.getWrapper().getPreloader();

        // is login ----------------------------------------------------------------------------------------------------

        if (!await Login.isLogin()) {
            UtilRedirect.toLogin();
        }

        const currentuser = await UserAPI.getUserInfo();

        if (currentuser) {
            const up = page.getWrapper().getMainSidebar().getSidebar().getUserPanel();

            if (currentuser.user) {
                const user = currentuser.user;

                up.setImage(
                    UtilAvatarGenerator.generateAvatar(
                        UtilShorname.getShortname(user.fullname),
                        'white',
                        UtilColor.getColor(user.username)
                    )
                );

                up.setUsername(user.fullname);
            }

            up.setOnClickFn(() => {
                loadPage(new Profil());
            });
        }

        // right navbar --------------------------------------------------------------------------------------------

        const rightNavbar = page.getWrapper().getNavbar().getRightNavbar();

        // eslint-disable-next-line no-new
        const langNavbarLink = new NavbarLinkLanguage(rightNavbar);

        const changeLang: ChangeLangClickFn = (lang): void => {
            Lang.setStoreLangSelect(lang.getCountryCode());
            Lang.i().setCurrentLang(lang);
            Lang.i().lAll();
        };

        // english
        langNavbarLink.addLang(new Lang_EN(), changeLang);
        // germany
        langNavbarLink.addLang(new Lang_DE(), changeLang);
        // spain
        langNavbarLink.addLang(new Lang_ES(), changeLang);

        const userSelectLang = Lang.getStoreLangSelect();

        if (userSelectLang) {
            langNavbarLink.setActiv(userSelectLang, true);
        } else {
            langNavbarLink.setActiv('us', true);
        }

        // eslint-disable-next-line no-new
        new NavbarLinkFullsize(rightNavbar);

        // eslint-disable-next-line no-new
        new NavbarLinkButton(
            rightNavbar,
            'fa-sign-out-alt', async() => {
                if (confirm('Logout?')) {
                    await Login.logout();
                    window.location.replace('/login.html');
                }
            }
        );

        // sidemenu ------------------------------------------------------------------------------------------------
        const sidemenuList: SideMenuEntry[] = [
            {
                title: 'Tours',
                icon: 'fa-solid fa-flag',
                name: 'tours',
                onClick: (): void => {
                    loadPage(new ToursPage());
                },
                items: [
                    {
                        title: 'Tours External',
                        icon: 'fa-solid fa-calendar-alt',
                        name: 'tours-external',
                        onClick: (): void => {
                            loadPage(new ToursExternal());
                        }
                    }
                ]
            },
            {
                title: 'Sighting',
                icon: 'fa-solid fa-binoculars',
                name: 'sighting',
                onClick: (): void => {
                    loadPage(new SightingPage());
                }
            },
            {
                title: 'Species comparison',
                icon: 'fa-solid fa-chart-line',
                name: 'cross-species-analytics',
                onClick: (): void => {
                    loadPage(new CrossSpeciesAnalyticsPage());
                }
            },
            {
                title: 'Ocean & Fishing',
                icon: 'fa-solid fa-water',
                name: 'ocean_fishing_map',
                onClick: (): void => {
                    loadPage(new OceanFishingMapPage());
                }
            },
            {
                title: 'Live AIS Map',
                icon: 'fa-solid fa-ship',
                name: 'ais-live-map',
                onClick: (): void => {
                    loadPage(new AisLiveMap());
                }
            }
        ];

        if (currentuser) {
            if (currentuser.user?.isAdmin) {
                const toursEntry = sidemenuList.find((s) => s.name === 'tours');
                if (toursEntry?.items) {
                    toursEntry.items.push({
                        title: 'Orphan Tracks',
                        icon: 'fa-solid fa-unlink',
                        name: 'orphan-tracks',
                        onClick: (): void => {
                            loadPage(new OrphanTracksPage());
                        }
                    });
                }

                sidemenuList.push({
                    title: 'Admin',
                    icon: 'fa-cogs',
                    name: 'admin',
                    onClick: (): void => {
                        loadPage(new AdminPage());
                    },
                    items: [
                        {
                            title: 'Users',
                            icon: 'fa-solid fa-users',
                            name: 'admin-users',
                            onClick: (): void => {
                                loadPage(new UsersPage());
                            }
                        },
                        {
                            title: 'User Groups',
                            icon: 'fa-solid fa-tags',
                            name: 'admin-user-groups',
                            onClick: (): void => {
                                loadPage(new GroupPage());
                            }
                        },
                        {
                            title: 'Roles',
                            icon: 'fa-solid fa-user-shield',
                            name: 'admin-roles',
                            onClick: (): void => {
                                loadPage(new RolesPage());
                            }
                        },
                        {
                            title: 'Organization',
                            icon: 'fa-solid fa-globe',
                            name: 'admin-organization',
                            onClick: (): void => {
                                loadPage(new Organization());
                            }
                        },
                        {
                            title: 'Species',
                            icon: 'fa-solid fa-paw',
                            name: 'admin-species',
                            onClick: (): void => {
                                loadPage(new SpeciesPage());
                            }
                        },
                        {
                            title: 'Vehicle',
                            icon: 'fa-solid fa-ship',
                            name: 'admin-vehicle',
                            onClick: (): void => {
                                loadPage(new Vehicle());
                            }
                        },
                        {
                            title: 'Encounters',
                            icon: 'fa-solid fa-satellite-dish',
                            name: 'admin-encounters',
                            onClick: (): void => {
                                loadPage(new EncounterCategories());
                            }
                        },
                        {
                            title: 'Devices',
                            icon: 'fa-solid fa-server',
                            name: 'admin-devices',
                            onClick: (): void => {
                                loadPage(new DevicesPage());
                            }
                        },
                        {
                            title: 'Earthquakes',
                            icon: 'fa-solid fa-house-crack',
                            name: 'admin-earthquakes',
                            onClick: (): void => {
                                loadPage(new EarthquakePage());
                            }
                        },
                        {
                            title: 'External Tour Sources',
                            icon: 'fa-solid fa-calendar-alt',
                            name: 'admin-external-tour-source',
                            onClick: (): void => {
                                loadPage(new ExternalTourSource());
                            }
                        },
                        {
                            title: 'Services',
                            icon: 'fa-solid fa-cog',
                            name: 'admin-services',
                            onClick: (): void => {
                                loadPage(new Services());
                            }
                        }
                    ]
                });
            }
        }

        const menu = page.getWrapper().getMainSidebar().getSidebar().getMenu();

        for (const item of sidemenuList) {
            const menuItem = new SidebarMenuItem(menu);

            menuItem.setName(item.name);
            menuItem.setTitle(new LangText(item.title));
            menuItem.setIconClass(item.icon);
            menuItem.setClick(item.onClick);

            let isSubActiv = false;

            if (item.items) {
                const menuTree = new SidebarMenuTree(menuItem);

                for (const sitem of item.items) {
                    const pmenuItem = new SidebarMenuItem(menuTree, true);
                    pmenuItem.setTitle(new LangText(sitem.title));
                    pmenuItem.setName(sitem.name);
                    pmenuItem.setClick(sitem.onClick);

                    if (sitem.icon) {
                        pmenuItem.setIconClass(sitem.icon);
                    }

                    if (page.getName() === sitem.name) {
                        pmenuItem.setActiv(true);
                        isSubActiv = true;
                    }
                }
            }

            if ((page.getName() === item.name) || isSubActiv) {
                menuItem.setActiv(true);
            }
        }

        menu.initTreeview();

        // ---------------------------------------------------------------------------------------------------------

        jQuery('#ccc_copyright').html(Lang.i().l('copyrightname'));
        jQuery('#ccc_version').html(Lang.i().l('version'));

        // ---------------------------------------------------------------------------------------------------------

        if (globalPage) {
            globalPage.unloadContent();
        }

        page.loadContent();
        preloader.readyLoad();

        globalPage = page;
    };

    // default page
    await loadPage(new SightingPage());
})();