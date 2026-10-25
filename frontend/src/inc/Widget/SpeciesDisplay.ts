/* global JQuery */
import {Badge2, BadgeType2, ComponentType, UtilColor, Widget2} from 'bambooo';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {UtilSpeciesContextMenu} from '../Utils/UtilSpeciesContextMenu';

/**
 * Optional callback fired when the user picks "Profiling" from the
 * species context menu. The caller that creates the SpeciesDisplay is
 * responsible for actually loading the profile page (typically via
 * `PageLoader.getInstance().load(...)`).
 */
export type SpeciesDisplayProfileFn = (speciesId: number) => void;

export class SpeciesDisplay extends Widget2 {

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
        element: ComponentType,
        sighting: SightingsEntry,
        speciesList: Map<number, SpeciesEntry>,
        onProfile?: SpeciesDisplayProfileFn
    ) {
        super({element: jQuery<HTMLSpanElement>('<span/>')});

        let specieName = '';
        /*
         * `undefined` → Badge2 falls back to its visible Bootstrap 5
         * `text-bg-info` class. A defined colour sets the badge background
         * directly. Must NOT default to an empty string: Badge2 treats an empty
         * string as a (defined) colour, so it adds neither the type class nor a
         * background — leaving a bare `.badge` that renders white-on-transparent
         * (i.e. an invisible, "empty" map popover). This is exactly what broke
         * sightings whose species group has no colour set.
         */
        let specieColor: string|undefined;

        const specie: SpeciesEntry|undefined = speciesList.get(sighting.species_id!);

        if (specie) {
            specieName = specie.name.split(',')[0];

            if (specie.species_group?.color) {
                specieColor = specie.species_group.color;
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

        this._badge = new Badge2({type: BadgeType2.info, color: specieColor});
        this._badge.appendTo(SpeciesDisplay._asParent(element));
        this._badge.getElement().html(`<b style="color: ${UtilColor.getContrastYIQ(specieColor ?? '#17a2b8')}">${specieName}</b>`);

        this._element = this._badge.getElement() as JQuery<HTMLSpanElement>;

        if (specie) {
            /*
             * Left-click reveals the context menu with the two
             * external taxon links + the internal profiling page.
             */
            UtilSpeciesContextMenu.attach(this._element, {
                speciesId: specie.id,
                speciesName: specieName,
                ottId: specie.ottid,
                aphiaId: specie.aphiaid ?? 0,
                onProfile
            });
        }
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