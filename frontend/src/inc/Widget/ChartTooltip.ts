/* global JQuery */

/**
 * ChartTooltip
 *
 * Shared hover tooltip for the d3 charts of a widget: one absolutely
 * positioned box inside the (position: relative) root, placed next to the
 * pointer and flipped to the left near the right edge.
 */
export class ChartTooltip {

    protected _root: JQuery;

    protected _tip: JQuery;

    public constructor(root: JQuery) {
        this._root = root;
        this._tip = jQuery('<div class="mwpa-chart-tip"/>').appendTo(root);
    }

    /**
     * Show the tooltip while the pointer is over a d3 selection.
     * @param {any} target d3 selection
     * @param {string|Function} html content, or a builder called on enter
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public bind(target: any, html: string | (() => string)): void {
        target
        .on('mouseenter', () => {
            this._tip.html(typeof html === 'string' ? html : html()).addClass('show');
        })
        .on('mousemove', (event: MouseEvent) => {
            this.move(event);
        })
        .on('mouseleave', () => {
            this.hide();
        });
    }

    /**
     * Show content at the pointer (for crosshair charts).
     * @param {string} html
     * @param {MouseEvent} event
     */
    public show(html: string, event: MouseEvent): void {
        this._tip.html(html).addClass('show');
        this.move(event);
    }

    public move(event: MouseEvent): void {
        const box = this._root[0].getBoundingClientRect();
        const tipW = this._tip.outerWidth() ?? 0;
        let left = event.clientX - box.left + 14;

        if (left + tipW > box.width) {
            left = event.clientX - box.left - tipW - 14;
        }

        this._tip.css({left: Math.max(0, left), top: event.clientY - box.top + 14});
    }

    public hide(): void {
        this._tip.removeClass('show');
    }

    /**
     * Let the drawn SVGs scale with their container (viewBox from the drawn
     * size), so a scrollbar appearing after the render can't make them
     * overflow the card.
     * @param {JQuery} root
     */
    public static fluid(root: JQuery): void {
        root.find('svg').each((_i, svg) => {
            const width = svg.getAttribute('width');
            const height = svg.getAttribute('height');

            if (width && height && !svg.hasAttribute('viewBox')) {
                svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
                svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.style.width = '100%';
                svg.style.height = 'auto';
                svg.style.maxWidth = `${width}px`;
            }
        });
    }

    /**
     * SVG path of a bar with rounded data end (4px) and square baseline.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {'h'|'v'} orientation h: grows to the right, v: grows upwards
     * @return {string}
     */
    public static barPath(x: number, y: number, w: number, h: number, orientation: 'h' | 'v'): string {
        if (orientation === 'h') {
            const r = Math.min(4, w, h / 2);
            return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
        }

        const r = Math.min(4, h, w / 2);
        return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
    }

    /**
     * Share as localized percent text ("4,5 %", "42 %").
     * @param {number} value
     * @param {number} total
     * @return {string}
     */
    public static percent(value: number, total: number): string {
        if (total <= 0) {
            return '0 %';
        }

        const share = (value / total) * 100;
        return `${share.toLocaleString(undefined, {maximumFractionDigits: share < 10 ? 1 : 0})} %`;
    }

}