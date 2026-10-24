/* global JQuery */
import {Badge2, BadgeType2, Component, ComponentType, UtilColor} from 'bambooo';
import {SpeciesEntryGroup} from '../Api/Species';

/**
 * SpeciesGroupDisplay
 */
export class SpeciesGroupDisplay extends Component<HTMLSpanElement> {

    protected _badge;

    public constructor(element: ComponentType, group: SpeciesEntryGroup) {
        super();

        this._badge = new Badge2({type: BadgeType2.info, color: group.color});
        this._badge.appendTo(this._getAnyElement(element));
        this._badge.getElement().html(`<b style="color: ${UtilColor.getContrastYIQ(group.color)}">${group.name}</b>`);

        this._element = this._badge.getElement() as JQuery<HTMLSpanElement>;
    }

}