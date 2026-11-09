import {TableDropdownFix} from './inc/Base/TableDropdownFix';
import {PageLoader} from './inc/PageLoader';
import {Sighting as SightingPage} from './inc/Pages/Sighting';

/**
 * Boot the MWPA SPA on the bambooo v2 shell (AdminLTE 4). The single
 * {@link PageLoader} owns the wrapper/navbar/sidebar/preloader and gates the
 * menu by the user's rights; it loads the default page (Sighting).
 */
const boot = async(): Promise<void> => {
    TableDropdownFix.install();
    await PageLoader.getInstance().load(new SightingPage());
};

/*
 * The bambooo v2 Wrapper mounts into the `.app-wrapper` element, so the DOM
 * must be parsed before we bootstrap. `defer` normally guarantees this, but we
 * guard explicitly on readyState to be safe.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', (): void => {
        boot().then();
    });
} else {
    boot().then();
}