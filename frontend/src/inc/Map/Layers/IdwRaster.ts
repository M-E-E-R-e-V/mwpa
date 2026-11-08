/**
 * A raster block to paint: the canvas dimensions (w, h), the block's top-left
 * pixel (px, py) and its nominal size (step, clipped to the canvas bounds).
 */
export type IdwBlock = {
    w: number;
    h: number;
    px: number;
    py: number;
    step: number;
};

/**
 * IdwRaster
 *
 * DOM-free raster helper for the IDW metric layer. Separated from the paint
 * method so the pixel-fill is readable and unit-testable.
 */
export class IdwRaster {

    /**
     * fillBlock — paint a `step`×`step` RGBA block at (px, py) into the image
     * buffer, clipped to the canvas (w, h) bounds. The caller reuses one
     * {@link IdwBlock} across the loop to keep the paint allocation-free.
     * @param {Uint8ClampedArray} data
     * @param {IdwBlock} block
     * @param {[number, number, number, number]} rgba
     */
    public static fillBlock(data: Uint8ClampedArray, block: IdwBlock, rgba: [number, number, number, number]): void {
        const blockW = Math.min(block.step, block.w - block.px);
        const blockH = Math.min(block.step, block.h - block.py);
        const [r, g, b, a] = rgba;

        for (let dy = 0; dy < blockH; dy++) {
            const rowStart = (((block.py + dy) * block.w) + block.px) * 4;

            for (let dx = 0; dx < blockW; dx++) {
                const idx = rowStart + (dx * 4);
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }

}