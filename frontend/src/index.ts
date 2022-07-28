import './config';
import {Login} from './inc/Api/Login';
import {User} from './inc/Api/User';
import {LangText} from './inc/Bambooo/Lang/LangText';
import {NavbarLinkButton} from './inc/Bambooo/Navbar/NavbarLinkButton';
import {NavbarLinkFullsize} from './inc/Bambooo/Navbar/NavbarLinkFullsize';
import {ChangeLangClickFn, NavbarLinkLanguage} from './inc/Bambooo/Navbar/NavbarLinkLanguage';
import {SidebarMenuItem} from './inc/Bambooo/Sidebar/SidebarMenuItem';
import {SidebarMenuTree} from './inc/Bambooo/Sidebar/SidebarMenuTree';
import {Lang} from './inc/Lang';
import {Admin} from './inc/Pages/Admin';
import {BasePage} from './inc/Pages/BasePage';
import {Sighting as SightingPage} from './inc/Pages/Sighting';
import {Species} from './inc/Pages/Species';
import {Tours as ToursPage} from './inc/Pages/Tours';
import {UtilAvatarGenerator} from './inc/Utils/UtilAvatarGenerator';
import {UtilColor} from './inc/Utils/UtilColor';
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
            window.location.replace('/login.html');
        }

        const currentuser = await User.getUserInfo();

        if (currentuser) {
            const up = page.getWrapper().getMainSidebar().getSidebar().getUserPanel();

            up.setImage(
                UtilAvatarGenerator.generateAvatar(
                    currentuser.user?.username!,
                    'white',
                    UtilColor.getColor(currentuser.user?.username!)
                )
            );

            up.setUsername(currentuser.user?.username!);
        }

        // right navbar --------------------------------------------------------------------------------------------

        const rightNavbar = page.getWrapper().getNavbar().getRightNavbar();

        // eslint-disable-next-line no-new
        const langNavbarLink = new NavbarLinkLanguage(rightNavbar);

        const changeLang: ChangeLangClickFn = (lang): void => {
            Lang.i().setCurrentLang(lang);
            Lang.i().lAll();
        };

        // english
        langNavbarLink.addLang(new Lang_EN(), changeLang);
        // germany
        langNavbarLink.addLang(new Lang_DE(), changeLang);

        langNavbarLink.setActiv('us');

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
                        loadPage(new Admin());
                    },
                    items: [
                        {
                            title: 'Species',
                            icon: 'fa-solid fa-paw',
                            name: 'admin-species',
                            onClick: (): void => {
                                loadPage(new Species());
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

                for( const sitem of item.items) {
                    const pmenuItem = new SidebarMenuItem(menuTree);
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

            if ( (page.getName() === item.name) || isSubActiv) {
                menuItem.setActiv(true);
            }
        }

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