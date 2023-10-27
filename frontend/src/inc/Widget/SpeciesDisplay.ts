import {Badge, BadgeType, DialogInfo, Element, ModalDialogType} from 'bambooo';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {UtilColor} from '../Utils/UtilColor';

export class SpeciesDisplay extends Element {

    protected _badge;

    /**
     * turtles
     * @protected
     */
    protected _turtles: string[] = [
        'Caretta caretta',
        'Dermochelys coriacea',
        'Chelonia mydas',
        'Eretmochelys imbricata',
        'Unknown sea turtle',
        'Eretmochelys imbricata - Hawksbill sea turtle',
        'Chelonia mydas - Green sea turtle',
        'Dermochelys coriacea - Leatherback sea turtle',
        'Caretta caretta - Loggerhead sea turtle'
    ];

    public constructor(element: Element, sighting: SightingsEntry, speciesList: Map<number, SpeciesEntry>) {
        super();

        let specieName = '';
        let specieColor = '#ffffff';
        let ottid: number;

        const specie = speciesList.get(sighting.species_id!);

        if (specie) {
            specieName = specie.name.split(',')[0];
            ottid = specie.ottid;

            if (specie.species_group) {
                specieColor = specie.species_group?.color;
            }
        } else {
            specieName = 'not set';
            specieColor = 'red';

            if (sighting.other) {
                if (this._turtles.includes(sighting.other?.trim())) {
                    specieName = sighting.other?.trim();
                    specieColor = '#27AE60';
                }
            }
        }

        this._badge = new Badge(
            element,
            `<b style="color: ${UtilColor.getContrastYIQ(specieColor)}">${specieName}</b>`,
            BadgeType.info,
            specieColor
        );

        this._element = this._badge.getElement();

        if (ottid) {
            const tooltpSpecStr = 'Click for more Information';

            this._element.attr('data-toggle', 'tooltip');
            this._element.attr('data-html', 'true');
            this._element.attr('data-original-title', tooltpSpecStr);
            this._element.css({
                cursor: 'pointer'
            });

            this._element.on('click', () => {
                let infoStr = 'You can learn more about the species at the following links:&nbsp;';
                infoStr += `<a href="https://tree.opentreeoflife.org/taxonomy/browse?id=${ottid}" target="_blank">Opentreeoflife.org</a><br>`;
                infoStr += `<iframe style="width: 100%; height: 400px; border: 0" src="https://www.onezoom.org/life.html/@=${ottid}""></iframe>`;

                DialogInfo.info(
                    'sightspeciesinfo',
                    ModalDialogType.xlarge,
                    `More Information over "${specieName}"`,
                    infoStr,
                    (_, modal: DialogInfo) => {
                        modal.hide();
                    }
                );
            });
        }
    }

}