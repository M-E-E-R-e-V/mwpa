import {Badge, BadgeType, Component, UtilColor} from 'bambooo';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {UtilSpeciesContextMenu} from '../Utils/UtilSpeciesContextMenu';

/**
 * Optional callback fired when the user picks "Profiling" from the
 * species context menu. The page that owns the SpeciesDisplay is
 * responsible for actually loading the profile page (it owns
 * `_loadPageFn`).
 */
export type SpeciesDisplayProfileFn = (speciesId: number) => void;

export class SpeciesDisplay extends Component<HTMLSpanElement> {

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

    public constructor(
        element: Element|any,
        sighting: SightingsEntry,
        speciesList: Map<number, SpeciesEntry>,
        onProfile?: SpeciesDisplayProfileFn
    ) {
        super();

        let specieName = '';
        let specieColor = '#ffffff';
        let specie: SpeciesEntry|undefined;

        specie = speciesList.get(sighting.species_id!);

        if (specie) {
            specieName = specie.name.split(',')[0];

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

        if (specie) {
            // Left-click reveals the context menu with the two
            // external taxon links + the internal profiling page.
            UtilSpeciesContextMenu.attach(this._element, {
                speciesId: specie.id,
                speciesName: specieName,
                ottId: specie.ottid,
                aphiaId: specie.aphiaid ?? 0,
                onProfile
            });
        }
    }

}