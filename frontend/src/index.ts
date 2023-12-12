import {
    ChangeLangClickFn,
    LangText,
    NavbarLinkButton,
    NavbarLinkFullsize,
    NavbarLinkLanguage,
    SidebarMenuItem, SidebarMenuTree
} from 'bambooo';
import {Login} from './inc/Api/Login';
import {User as UserAPI} from './inc/Api/User';
import {Lang} from './inc/Lang';
import {Admin as AdminPage} from './inc/Pages/Admin';
import {BasePage} from './inc/Pages/BasePage';
import {Group as GroupPage} from './inc/Pages/Group';
import {Organization} from './inc/Pages/Organization';
import {Profil} from './inc/Pages/Profil';
import {Sighting as SightingPage} from './inc/Pages/Sighting';
import {Species as SpeciesPage} from './inc/Pages/Species';
import {Tours as ToursPage} from './inc/Pages/Tours';
import {Users as UsersPage} from './inc/Pages/Users';
import {UtilAvatarGenerator} from './inc/Utils/UtilAvatarGenerator';
import {UtilColor} from './inc/Utils/UtilColor';
import {UtilRedirect} from './inc/Utils/UtilRedirect';
import {UtilShorname} from './inc/Utils/UtilShorname';
import {Lang_DE} from './langs/Lang_DE';
import {Lang_EN} from './langs/Lang_EN';

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
                }
            },
            {
                title: 'Sighting',
                icon: 'fa-solid fa-binoculars',
                name: 'sighting',
                onClick: (): void => {
                    loadPage(new SightingPage());
                }
            }
        ];

        if (currentuser) {
            if (currentuser.user?.isAdmin) {
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
                                //loadPage(new Species());
                            }
                        },
                        {
                            title: 'Encounters',
                            icon: 'fa-solid fa-satellite-dish',
                            name: 'admin-encounters',
                            onClick: (): void => {
                                //loadPage(new Species());
                            }
                        },
                        {
                            title: 'Devices',
                            icon: 'fa-solid fa-server',
                            name: 'admin-devices',
                            onClick: (): void => {
                                //loadPage(new Species());
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