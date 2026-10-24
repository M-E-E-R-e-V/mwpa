/* global JQuery */
import {Badge2, BadgeType2, Component, ComponentType, DialogInfo2, ModalDialogType2} from 'bambooo';
import {EncounterCategorieEntry} from '../Api/EncounterCategories';
import {SightingsEntry} from '../Api/Sightings';

export class ReactionDisplay extends Component<HTMLSpanElement> {

    protected _badge;

    public constructor(element: ComponentType, sighting: SightingsEntry, mencates: Map<number, EncounterCategorieEntry>) {
        super();

        let reactionName = 'not set';

        if (sighting.reaction_id) {
            const encCate = mencates.get(sighting.reaction_id);

            if (encCate) {
                reactionName = encCate.name;
            }
        }

        this._badge = new Badge2({text: `${reactionName}`, type: BadgeType2.secondary});
        this._badge.appendTo(this._getAnyElement(element));

        this._element = this._badge.getElement() as JQuery<HTMLSpanElement>;

        const tooltpSpecStr = 'Click for more Information';

        this._element.attr('data-toggle', 'tooltip');
        this._element.attr('data-html', 'true');
        this._element.attr('data-original-title', tooltpSpecStr);
        this._element.css({
            cursor: 'pointer'
        });

        this._element.on('click', () => {
            let infoStr = '';

            for (const [, value] of mencates) {
                if (!value.isdeleted) {
                    infoStr += `<b>${value.name}</b>:&nbsp;${value.description}<br><br>`;
                }
            }

            DialogInfo2.info(
                'sightspeciesinfo',
                ModalDialogType2.xlarge,
                `REACTION Definitions: [${reactionName}] by Sighting #${sighting.id}`,
                infoStr,
                (_, modal: DialogInfo2) => {
                    modal.hide();
                }
            );
        });
    }

}