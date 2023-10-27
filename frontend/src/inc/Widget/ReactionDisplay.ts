import {Badge, BadgeType, DialogInfo, Element, ModalDialogType} from 'bambooo';
import {EncounterCategorieEntry} from '../Api/EncounterCategories';
import {SightingsEntry} from '../Api/Sightings';

export class ReactionDisplay extends Element {

    protected _badge;

    public constructor(element: Element, sighting: SightingsEntry, mencates: Map<number, EncounterCategorieEntry>) {
        super();

        let reactionName = 'not set';

        if (sighting.reaction_id) {
            const encCate = mencates.get(sighting.reaction_id);

            if (encCate) {
                reactionName = encCate.name;
            }
        }

        this._badge = new Badge(element, `${reactionName}`, BadgeType.secondary);

        this._element = this._badge.getElement();

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

            DialogInfo.info(
                'sightspeciesinfo',
                ModalDialogType.xlarge,
                `REACTION Definitions: [${reactionName}] by Sighting #${sighting.id}`,
                infoStr,
                (_, modal: DialogInfo) => {
                    modal.hide();
                }
            );
        });
    }

}