/**
 * UtilWormsLink — opens a WoRMS (marinespecies.org) taxon page for a
 * given aphia id in a new tab.
 *
 * Why no iframe (vs UtilOttLink): marinespecies.org sends
 * `Content-Security-Policy: frame-ancestors 'self' vliz.be ...`, so
 * the browser refuses to embed it in our app regardless of our own
 * CSP. A new-tab open is the only working UX.
 */
export class UtilWormsLink {

    /**
     * Attach a tooltip + click handler that opens the WoRMS taxon page
     * for `aphiaId` in a new tab.
     * @param {any} element
     * @param {string|number} aphiaId
     */
    public static setDialog(element: any, _titleName: string, aphiaId: string|number): void {
        const tooltipStr = 'Open on marinespecies.org (WoRMS)';

        element.attr('data-toggle', 'tooltip');
        element.attr('data-html', 'true');
        element.attr('data-original-title', tooltipStr);
        element.css({
            cursor: 'pointer'
        });

        element.on('click', () => {
            const url = `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${aphiaId}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

}