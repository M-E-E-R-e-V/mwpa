import {Element} from '../../Element';

/**
 * ImageCoin
 */
export class ImageCoin extends Element {

    /**
     * constructor
     * @param element
     * @param symbol
     */
    public constructor(element: any, symbol: string) {
        super();

        const tsymbol = symbol.toLowerCase().replace('$', '');

        this._element = jQuery(`<img src="img/currency/${tsymbol}.png" width="36px" height="36px" class="img-circle elevation-2" alt="${tsymbol}">`).appendTo(element);
        this._element.on('error', () => {
            this._element.attr('src', 'img/currency/none.png');
        });
    }

}