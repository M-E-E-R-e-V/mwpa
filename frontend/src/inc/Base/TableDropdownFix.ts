/**
 * TableDropdownFix
 *
 * Row menus (bambooo ButtonMenu = Bootstrap dropdown) inside a table sit
 * in the scroll container of the table (`.table-wrapper`, overflow: auto).
 * With few rows that container is low and clips the opened menu. Before
 * Bootstrap creates the dropdown on the first click, switch its Popper to
 * `strategy: fixed`, so the menu is placed relative to the viewport and
 * floats above the container. Installed once for the whole app.
 */
export class TableDropdownFix {

    protected static _installed = false;

    /**
     * Containers whose overflow clips dropdowns.
     */
    protected static readonly _SCROLL_CONTAINERS = '.table-wrapper, .table-responsive';

    public static install(): void {
        if (TableDropdownFix._installed) {
            return;
        }

        TableDropdownFix._installed = true;

        /*
         * Window capture phase: Bootstrap's delegated handlers sit on the
         * document in the capture phase, a window capture listener runs
         * before them.
         */
        window.addEventListener('click', (event: MouseEvent): void => {
            TableDropdownFix._prepare(event.target);
        }, true);

        window.addEventListener('keydown', (event: KeyboardEvent): void => {
            TableDropdownFix._prepare(event.target);
        }, true);
    }

    protected static _prepare(target: EventTarget | null): void {
        if (!(target instanceof Element)) {
            return;
        }

        const toggle = target.closest('[data-bs-toggle="dropdown"]');

        if (toggle && !toggle.hasAttribute('data-bs-popper-config') && toggle.closest(TableDropdownFix._SCROLL_CONTAINERS)) {
            toggle.setAttribute('data-bs-popper-config', '{"strategy":"fixed"}');
        }
    }

}