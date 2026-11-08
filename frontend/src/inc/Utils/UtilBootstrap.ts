/* global JQuery */

/**
 * Thin accessor for the global Bootstrap 5 bundle (loaded via the
 * `bootstrap.bundle` script tag in index.html) + helpers for the component
 * patterns that Bootstrap 5 removed from jQuery.
 *
 * Bootstrap 5 dropped the jQuery plugins (`$(el).popover()`, `.modal()`,
 * `.tooltip()`); everything is now the vanilla `new bootstrap.Xxx(el, opts)`
 * API. Code ported from the AdminLTE 3 / Bootstrap 4 shell used the jQuery
 * plugins and silently no-ops (or renders empty) under Bootstrap 5 — route it
 * through here instead.
 */
export class UtilBootstrap {

    /**
     * The global bootstrap namespace, or undefined if the bundle isn't loaded.
     * @protected
     * @returns {any}
     */
    protected static _bs(): any {
        return (window as unknown as {bootstrap?: any;}).bootstrap;
    }

    /**
     * Bootstrap 5 Popover constructor (or undefined).
     * @returns {any}
     */
    public static getPopover(): any {
        return UtilBootstrap._bs()?.Popover;
    }

    /**
     * Bootstrap 5 Modal constructor (or undefined).
     * @returns {any}
     */
    public static getModal(): any {
        return UtilBootstrap._bs()?.Modal;
    }

    /**
     * Bootstrap 5 Tooltip constructor (or undefined).
     * @returns {any}
     */
    public static getTooltip(): any {
        return UtilBootstrap._bs()?.Tooltip;
    }

    /**
     * Attach a click-triggered info popover to a button and auto-dismiss it on
     * the next outside click. Replaces the `$(btn).popover({...})` +
     * `shown.bs.popover` → `$(btn).popover('hide')` jQuery pattern.
     * @param {JQuery} btn trigger element
     * @param {object} options Bootstrap 5 Popover options
     * @param {string} dismissSelector selector of the trigger (kept open on click)
     * @param {string} ns unique namespace for the document click handler
     */
    public static attachInfoPopover(btn: JQuery, options: object, dismissSelector: string, ns: string): void {
        const Popover = UtilBootstrap.getPopover();

        if (!Popover || !btn[0]) {
            return;
        }

        const popover = new Popover(btn[0], options);

        btn.on('shown.bs.popover', () => {
            jQuery(document).one(`click.${ns}`, (ev) => {
                if (!jQuery(ev.target).closest(`.popover, ${dismissSelector}`).length) {
                    popover.hide();
                }
            });
        });
    }

    /**
     * Show an existing modal element via the vanilla Bootstrap 5 Modal API.
     * The caller still wires `hidden.bs.modal` on the element for teardown.
     * @param {HTMLElement} element
     */
    public static showModal(element: HTMLElement): void {
        const Modal = UtilBootstrap.getModal();

        if (!Modal) {
            return;
        }

        new Modal(element).show();
    }

    /**
     * Hide any currently-open Bootstrap tooltips (replaces
     * `$('[data-bs-toggle="tooltip"]').tooltip('hide')`).
     */
    public static hideAllTooltips(): void {
        const Tooltip = UtilBootstrap.getTooltip();

        if (!Tooltip) {
            return;
        }

        jQuery('[data-bs-toggle="tooltip"]').each((_i, el) => {
            Tooltip.getInstance(el)?.hide();
        });
    }

}