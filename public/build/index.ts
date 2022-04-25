import './config';
import {Login} from './inc/Api/Login';
import {User} from './inc/Api/User';
import {Lang} from './inc/Lang';
import {NavbarLinkButton} from './inc/PageComponents/Navbar/NavbarLinkButton';
import {NavbarLinkFullsize} from './inc/PageComponents/Navbar/NavbarLinkFullsize';
import {SidebarMenuItem} from './inc/PageComponents/Sidebar/SidebarMenuItem';
import {BasePage} from './inc/Pages/BasePage';
import {Sighting as SightingPage} from './inc/Pages/Sighting';
import {Tours as ToursPage} from './inc/Pages/Tours';
import {UtilAvatarGenerator} from './inc/Utils/UtilAvatarGenerator';
import {UtilColor} from './inc/Utils/UtilColor';

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
        new NavbarLinkFullsize(rightNavbar.getElement());
        // eslint-disable-next-line no-new
        new NavbarLinkButton(
            rightNavbar.getElement(),
            'fa-sign-out-alt', async() => {
                if (confirm('Logout?')) {
                    await Login.logout();
                    window.location.replace('/login.html');
                }
            }
        );

        // sidemenu ------------------------------------------------------------------------------------------------
        const sidemenuList = [
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
                        // loadPage(new Admin());
                    }
                });
            }
        }

        const menu = page.getWrapper().getMainSidebar().getSidebar().getMenu();

        for (const item of sidemenuList) {
            const menuItem = new SidebarMenuItem(menu);

            menuItem.setName(item.name);
            menuItem.setTitle(item.title);
            menuItem.setIconClass(item.icon);

            if (page.getName() === item.name) {
                menuItem.setActiv(true);
            }

            menuItem.setClick(item.onClick);
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