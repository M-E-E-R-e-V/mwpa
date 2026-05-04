import {Badge, BadgeType, Component, ComponentType, UtilColor} from 'bambooo';
import {SpeciesEntryGroup} from '../Api/Species';

/**
 * SpeciesGroupDisplay
 */
export class SpeciesGroupDisplay extends Component<HTMLSpanElement> {

    protected _badge;

    public constructor(element: ComponentType, group: SpeciesEntryGroup) {
        super();

        this._badge = new Badge(
            element,
            `<b style="color: ${UtilColor.getContrastYIQ(group.color)}">${group.name}</b>`,
            BadgeType.info,
            group.color
        );
    }

}