/**
 * Options for a species context-menu binding.
 */
export type SpeciesContextMenuOptions = {
    speciesId: number;
    speciesName: string;
    ottId: number;
    aphiaId: number;
    onProfile?: (speciesId: number) => void;
};

/**
 * UtilSpeciesContextMenu — attach a right-click menu to a species
 * badge with three actions:
 *   1. Open on Open Tree of Life (tree.opentreeoflife.org)
 *   2. Open on WoRMS (marinespecies.org)
 *   3. Open species profile inside MWPA
 *
 * Items are rendered disabled when the underlying ID is missing (0)
 * or when no profile callback is supplied. A single global menu is
 * kept open at a time; outside-click or Esc closes it.
 */
export class UtilSpeciesContextMenu {

    /**
     * The currently-open menu element, if any. Static so a fresh
     * `contextmenu` on a different badge can close the previous one
     * before opening its own.
     * @protected
     */
    protected static _open: JQuery | null = null;

    /**
     * Attach the menu to `element`. A left-click on the bound element
     * shows the menu at the cursor; we stop propagation so the
     * surrounding row/cell click handlers (if any) don't fire.
     */
    public static attach(element: any, opts: SpeciesContextMenuOptions): void {
        element.css({cursor: 'pointer'});
        element.on('click', (ev: JQuery.ClickEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            UtilSpeciesContextMenu._show(ev.pageX, ev.pageY, opts);
        });
    }

    /**
     * Close any open menu.
     */
    protected static _close(): void {
        if (UtilSpeciesContextMenu._open) {
            UtilSpeciesContextMenu._open.remove();
            UtilSpeciesContextMenu._open = null;
            jQuery(document).off('mousedown.speciesctx keydown.speciesctx');
        }
    }

    /**
     * Build and show the menu at the cursor position.
     */
    protected static _show(x: number, y: number, opts: SpeciesContextMenuOptions): void {
        UtilSpeciesContextMenu._close();

        const menu = jQuery('<div class="dropdown-menu show" style="position:absolute;z-index:10500;display:block;"/>')
            .css({left: `${x}px`, top: `${y}px`})
            .appendTo('body');

        const header = jQuery('<h6 class="dropdown-header" style="white-space:nowrap;"/>')
            .text(opts.speciesName)
            .appendTo(menu);
        // Avoid eslint no-unused-vars; the header reads opts only for its label.
        header.attr('data-species-id', `${opts.speciesId}`);

        UtilSpeciesContextMenu._addItem(
            menu,
            '<i class="fas fa-tree fa-fw"></i> Open Tree of Life',
            opts.ottId > 0,
            () => {
                window.open(
                    `https://tree.opentreeoflife.org/taxonomy/browse?id=${opts.ottId}`,
                    '_blank',
                    'noopener,noreferrer'
                );
            }
        );

        UtilSpeciesContextMenu._addItem(
            menu,
            '<i class="fas fa-water fa-fw"></i> WoRMS (marinespecies.org)',
            opts.aphiaId > 0,
            () => {
                window.open(
                    `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${opts.aphiaId}`,
                    '_blank',
                    'noopener,noreferrer'
                );
            }
        );

        UtilSpeciesContextMenu._addItem(
            menu,
            '<i class="fas fa-chart-bar fa-fw"></i> Profiling',
            opts.speciesId > 0 && opts.onProfile !== undefined,
            () => {
                if (opts.onProfile) {
                    opts.onProfile(opts.speciesId);
                }
            }
        );

        // Keep the menu inside the viewport — if it overflows on the
        // right/bottom edge, shift it back by its own size.
        const rect = (menu[0] as HTMLElement).getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        if (rect.right > winW) {
            menu.css({left: `${Math.max(0, x - rect.width)}px`});
        }
        if (rect.bottom > winH) {
            menu.css({top: `${Math.max(0, y - rect.height)}px`});
        }

        UtilSpeciesContextMenu._open = menu;

        jQuery(document).on('mousedown.speciesctx', (mev) => {
            if (jQuery(mev.target).closest(menu).length === 0) {
                UtilSpeciesContextMenu._close();
            }
        });
        jQuery(document).on('keydown.speciesctx', (kev) => {
            if (kev.key === 'Escape') {
                UtilSpeciesContextMenu._close();
            }
        });
    }

    /**
     * Build a single dropdown item.
     */
    protected static _addItem(menu: JQuery, html: string, enabled: boolean, onClick: () => void): void {
        const item = jQuery('<a class="dropdown-item" href="#"/>').html(html).appendTo(menu);
        if (!enabled) {
            item.addClass('disabled')
                .css({opacity: '0.45', cursor: 'not-allowed'})
                .on('click', (ev) => {
                    ev.preventDefault();
                });
            return;
        }
        item.on('click', (ev) => {
            ev.preventDefault();
            UtilSpeciesContextMenu._close();
            onClick();
        });
    }

}