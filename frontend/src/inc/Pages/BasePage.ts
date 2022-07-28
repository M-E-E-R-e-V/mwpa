import {LeftNavbarPushmenu} from '../Bambooo/Navbar/LeftNavbarPushmenu';
import {Wrapper} from '../Bambooo/Wrapper';

type loadPageFn = (apage: BasePage) => void;

/**
 * BasePage
 */
export class BasePage {

    /**
     * const Title
     * @private
     */
    private TITLE: string = 'MWPA';

    /**
     * const logo
     * @private
     */
    private LOGO: string = 'images/whale-ico.png';

    /**
     * Wrapper
     * @protected
     */
    protected _wrapper = new Wrapper();

    /**
     * page name
     * @protected
     */
    protected _name: string = 'base';

    /**
     * load page function
     * @protected
     */
    protected _loadPageFn: loadPageFn | null = null;

    /**
     * constructor
     */
    public constructor() {
        // eslint-disable-next-line no-new
        new LeftNavbarPushmenu(this._wrapper.getNavbar().getLeftNavbar());

        const preloader = this._wrapper.getPreloader();

        preloader.setTitle(this.TITLE);
        preloader.setImage(this.LOGO);

        const mainSidebar = this._wrapper.getMainSidebar();

        mainSidebar.getLogo().setTitle(this.TITLE);
        mainSidebar.getLogo().setImage(this.LOGO);
    }

    /**
     * getWrapper
     */
    public getWrapper(): Wrapper {
        return this._wrapper;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._name;
    }

    /**
     * setLoadPageFn
     * @param aloadPageFn
     */
    public setLoadPageFn(aloadPageFn: loadPageFn): void {
        this._loadPageFn = aloadPageFn;
    }

    /**
     * loadContent
     */
    public loadContent(): void {
        // load content overwrite
    }

    /**
     * unloadContent
     */
    public unloadContent(): void {
        // unload content overwrite
    }

}