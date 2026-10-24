/* global JQuery */
import {Badge2, BadgeType2, ComponentType, UtilColor, Widget2} from 'bambooo';
import {SpeciesEntryGroup} from '../Api/Species';

/**
 * SpeciesGroupDisplay
 */
export class SpeciesGroupDisplay extends Widget2 {

    protected _badge;

    public constructor(element: ComponentType, group: SpeciesEntryGroup) {
        super({element: jQuery<HTMLSpanElement>('<span/>')});

        this._badge = new Badge2({type: BadgeType2.info, color: group.color});
        this._badge.appendTo(SpeciesGroupDisplay._asParent(element));
        this._badge.getElement().html(`<b style="color: ${UtilColor.getContrastYIQ(group.color)}">${group.name}</b>`);

        this._element = this._badge.getElement() as JQuery<HTMLSpanElement>;
    }

    /**
     * Resolve a parent (bambooo component, jQuery or selector) to a jQuery
     * handle the badge can be appended to.
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