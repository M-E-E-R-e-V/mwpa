import {BasePage2, Content2, IPageLoader2, IWrapper2, LangTextV2} from 'bambooo';
import {IBasePage} from '../Base/IBasePage';

/**
 * onLoadTable
 */
export type onLoadTable = () => void;

/**
 * Title accepted by the v2 content-header (Component|JQuery|string).
 */
type PageTitle = Parameters<BasePage2['setTitle']>[0];

/**
 * BasePage
 *
 * MWPA base page on top of the bambooo v2 shell (AdminLTE 4). The wrapper,
 * navbar, sidebar and preloader are owned by the single {@link PageLoader}; a
 * page reaches them through {@link getWrapper} once the loader has been
 * injected (i.e. from {@link loadContent}, not the constructor).
 */
export class BasePage extends BasePage2 implements IBasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'base';

    /**
     * on load table
     * @protected
     */
    protected _onLoadTable: onLoadTable|null = null;

    /**
     * Toast (SweetAlert2 mixin). Re-typed to `any` (no initializer — ES2017
     * target keeps the base's constructor-assigned value) so the many existing
     * `this._toast.fire({title: <unknown> })` call sites in catch blocks keep
     * compiling as they did against the old loosely-typed v1 base page.
     * @protected
     */
    protected override _toast: any;

    /**
     * A title requested before the page loader was injected (e.g. from a page
     * constructor). Applied once the loader is set.
     * @protected
     */
    protected _pendingTitle: PageTitle|null = null;

    /**
     * Constructor — wire the MWPA toast style (top-end, auto-dismiss) into the
     * base page's SweetAlert2 mixin (`this._toast`, used across pages).
     */
    public constructor() {
        super({
            swal: {
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            }
        });
    }

    /**
     * setPageLoader — inject the loader and flush a buffered title.
     * @param {IPageLoader2} loader
     */
    public override setPageLoader(loader: IPageLoader2): void {
        super.setPageLoader(loader);

        if (this._pendingTitle !== null) {
            super.setTitle(this._pendingTitle);
            this._pendingTitle = null;
        }
    }

    /**
     * setTitle — set the content-header title. Buffers the value when called
     * before the page loader is available (e.g. from a page constructor).
     * @param {PageTitle} title
     */
    public override setTitle(title: PageTitle): void {
        if (!this._pageLoader) {
            this._pendingTitle = title;
            return;
        }

        super.setTitle(title);
    }

    /**
     * Return the shared shell wrapper (from the page loader). Only valid after
     * the page loader was set (inside loadContent), not the constructor.
     * @protected
     * @returns {IWrapper2}
     */
    protected get _wrapper(): IWrapper2 {
        if (!this._pageLoader) {
            throw new Error('BasePage: page loader not set yet');
        }

        return this._pageLoader.getWrapper();
    }

    /**
     * getWrapper
     * @returns {IWrapper2}
     */
    public getWrapper(): IWrapper2 {
        return this._wrapper;
    }

    /**
     * Add a page-action button to the navbar (top), replacing the old
     * LeftNavbarLink "+ add" placement. Re-created from loadContent on every
     * navigation (the page-action navbar area is cleared by the loader).
     * @param {string|LangTextV2} label
     * @param {string} iconClass e.g. 'fas fa-plus'
     * @param {() => void} onClick
     * @protected
     */
    protected addNavbarButton(label: string|LangTextV2, iconClass: string, onClick: () => void): void {
        const navbar = this._wrapper.getNavbar();

        if (!navbar) {
            return;
        }

        const nav = navbar.getPageActionNavbar();
        const li = jQuery('<li class="nav-item"/>').appendTo(nav.getElement());
        const a = jQuery(`<a class="nav-link" href="#"><i class="${iconClass} me-1"></i> </a>`).appendTo(li);

        if (typeof label === 'string') {
            // Wrap in a LangTextV2 so the button label is translatable too.
            new LangTextV2({text: label}).appendTo(a);
        } else {
            label.appendTo(a);
        }

        a.on('click', (event): void => {
            event.preventDefault();
            onClick();
        });
    }

    /**
     * Return the page content.
     * @returns {Content2}
     */
    public override getContent(): Content2 {
        return super.getContent();
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        // load content overwrite
    }

    /**
     * unloadContent
     */
    public override async unloadContent(): Promise<void> {
        // unload content overwrite
    }

}