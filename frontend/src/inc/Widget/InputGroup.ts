/* global JQuery */
import {ComponentType, Widget2} from 'bambooo';

export class InputGroup extends Widget2 {

    public constructor(element: ComponentType) {
        super({
            element: jQuery<HTMLDivElement>('<div class="input-group" />')
        });

        this._element.appendTo(InputGroup._asParent(element));
    }

    /**
     * Resolve a parent element (bambooo component, jQuery or selector) to a
     * jQuery handle the group can be appended to.
     * @param {ComponentType} element
     * @return {JQuery}
     * @protected
     */
    protected static _asParent(element: ComponentType): JQuery {
        const maybe = element as {getElement?: () => JQuery;} | null | undefined;

        if (maybe && typeof maybe.getElement === 'function') {
            return maybe.getElement();
        }

        return jQuery(element as JQuery.Selector);
    }

}