import {Element} from 'bambooo';

export class InputGroup extends Element {

    public constructor(element: any|Element) {
        super();

        const telement = this._getAnyElement(element);
        this._element = jQuery('<div class="input-group" />').appendTo(telement);
    }

}