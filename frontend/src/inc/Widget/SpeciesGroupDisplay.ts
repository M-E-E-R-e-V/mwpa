import {Badge, BadgeType, Element, UtilColor} from 'bambooo';
import {SpeciesEntryGroup} from '../Api/Species';

/**
 * SpeciesGroupDisplay
 */
export class SpeciesGroupDisplay extends Element {

    protected _badge;

    public constructor(element: Element|any, group: SpeciesEntryGroup) {
        super();

        this._badge = new Badge(
            element,
            `<b style="color: ${UtilColor.getContrastYIQ(group.color)}">${group.name}</b>`,
            BadgeType.info,
            group.color
        );
    }

}