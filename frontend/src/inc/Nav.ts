import type {BasePage} from './Pages/BasePage';

/**
 * Nav
 *
 * Navigation mediator that decouples pages from the concrete {@link PageLoader}.
 * Pages trigger navigation through `Nav.load(new SomePage())` instead of
 * `PageLoader.getInstance().load(...)`, so they no longer import the loader —
 * which imports every page class — breaking the PageLoader ↔ Pages import cycle.
 * The loader registers its callback once at construction via {@link register}.
 */
export class Nav {

    /**
     * The registered loader callback (set by PageLoader on construction).
     * @private
     */
    private static _load: ((page: BasePage) => Promise<boolean>)|null = null;

    /**
     * register — wire the concrete page loader. Called once by PageLoader.
     * @param {(page: BasePage) => Promise<boolean>} fn
     */
    public static register(fn: (page: BasePage) => Promise<boolean>): void {
        Nav._load = fn;
    }

    /**
     * load — navigate to a page through the registered loader. No-op (resolves
     * to false) until a loader has been registered.
     * @param {BasePage} page
     * @returns {Promise<boolean>}
     */
    public static async load(page: BasePage): Promise<boolean> {
        if (Nav._load === null) {
            return false;
        }

        return Nav._load(page);
    }

}