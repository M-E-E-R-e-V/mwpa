import {LangTextV2} from 'bambooo';
import {BasePage} from '../Pages/BasePage';

/**
 * MWPA declarative side-menu entry. Mapped onto the bambooo v2
 * PageSideMenuEntry (page -> ref, gated by aclRight) by the PageLoader.
 * `aclRight` is a right key (e.g. 'tours_read'); undefined = always visible.
 */
export type PageSideMenuEntry = {
    title: string|LangTextV2;
    icon: string;
    name: string;
    page?: new () => BasePage;
    aclRight?: string;
    items?: PageSideMenuEntry[];
};