import {Badge, BadgeType, Element, UtilColor} from 'bambooo';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {UtilOttLink} from '../Utils/UtilOttLink';

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

    public constructor(element: Element|any, sighting: SightingsEntry, speciesList: Map<number, SpeciesEntry>) {
        super();

        let specieName = '';
        let specieColor = '#ffffff';
        let ottid: number|null = null;

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

        if (ottid !== null) {
            UtilOttLink.setDialog(this._element, specieName, ottid);
        }
    }

}