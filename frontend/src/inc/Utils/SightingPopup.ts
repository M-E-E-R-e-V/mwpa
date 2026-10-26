import moment from 'moment';
import {BehaviouralStateEntry} from '../Api/BehaviouralStates';
import {EncounterCategorieEntry} from '../Api/EncounterCategories';
import {OrganizationEntry} from '../Api/Organization';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {VehicleEntry} from '../Api/Vehicle';
import {VehicleDriverEntry} from '../Api/VehicleDriver';
import {UtilSelect} from './UtilSelect';

/**
 * The lookup maps the sighting map popover resolves foreign keys against.
 */
export type SightingPopupLookups = {
    species: Map<number, SpeciesEntry>;
    vehicles: Map<number, VehicleEntry>;
    drivers: Map<number, VehicleDriverEntry>;
    organizations: Map<number, OrganizationEntry>;
    behaviours: Map<number, BehaviouralStateEntry>;
    encounterCategories: Map<number, EncounterCategorieEntry>;
};

/**
 * SightingPopup
 *
 * Pure (DOM-free) derivation of the sighting map-popover field rows. Extracted
 * from Sighting._buildSightingPopup so the many conditional fields and the two
 * JSON id-map lookups are unit-testable and the render method stays small. Row
 * labels are English keys (translated by the renderer); empty values are kept
 * here and filtered out at render time.
 */
export class SightingPopup {

    /**
     * rows — the [labelKey, value] popover rows for a sighting, in display order.
     * @param {SightingsEntry} entry
     * @param {SightingPopupLookups} lookups
     * @returns {[string, string][]}
     */
    public static rows(entry: SightingsEntry, lookups: SightingPopupLookups): [string, string][] {
        const date = entry.date ? moment(entry.date.split(' ')[0]).format('YYYY.MM.DD') : '';
        const vehicleName = SightingPopup._lookupName(entry.vehicle_id, lookups.vehicles, (v) => v.name);
        const driverName = SightingPopup._lookupName(entry.vehicle_driver_id, lookups.drivers, (v) => v.user.name);
        const orgStr = SightingPopup._lookupName(entry.organization_id, lookups.organizations, (v) => v.description);
        const reactionStr = SightingPopup._lookupName(entry.reaction_id, lookups.encounterCategories, (v) => v.name);

        const timeStr = entry.tour_start ?? entry.tour_end
            ? `${entry.tour_start ?? ''} – ${entry.tour_end ?? ''}`
            : '';

        const distanceNum = Number(entry.distance_coast);
        const distanceStr = entry.distance_coast && Number.isFinite(distanceNum)
            ? `${distanceNum.toFixed(2)} mi`
            : entry.distance_coast ?? '';

        const otherSpeciesNames = SightingPopup._parseIdMapNames(
            entry.other_species ?? '',
            (id): string | undefined => lookups.species.get(id)?.name.split(',')[0]
        );
        const behaviourNames = SightingPopup._parseIdMapNames(
            entry.behaviours ?? '',
            (id): string | undefined => lookups.behaviours.get(id)?.name
        );

        return [
            ['Date', date],
            ['Sighting', `#${entry.id} · Tour #${entry.tour_id}`],
            ['Time', timeStr],
            ['Other species', otherSpeciesNames.join(', ')],
            ['Group-Size', SightingPopup._groupSizeStr(entry)],
            ['Subgroups', entry.subgroups ? UtilSelect.getSelectStr(entry.subgroups) : ''],
            ['Behaviour', behaviourNames.join(', ')],
            ['Reaction', reactionStr],
            ['Vehicle', vehicleName],
            ['Driver', driverName],
            ['Organization', orgStr],
            ['Beaufort', entry.beaufort_wind ?? ''],
            ['Distance', distanceStr],
            ['Photos', entry.photo_taken ? UtilSelect.getSelectStr(entry.photo_taken) : ''],
            ['Note', entry.note ?? '']
        ];
    }

    /**
     * _lookupName — resolve an optional foreign key to a display name via its
     * lookup map, or '' when the id is absent/unknown.
     * @param {number | undefined} id
     * @param {Map<number, T>} map
     * @param {(value: T) => string} field
     * @returns {string}
     * @private
     */
    private static _lookupName<T>(id: number | undefined, map: Map<number, T>, field: (value: T) => string): string {
        if (!id) {
            return '';
        }

        const value = map.get(id);
        return value ? field(value) : '';
    }

    /**
     * _groupSizeStr — "count (n juv, n calves, n newborn)" or '' when the group
     * size is unknown.
     * @param {SightingsEntry} entry
     * @returns {string}
     * @private
     */
    private static _groupSizeStr(entry: SightingsEntry): string {
        if (entry.species_count === undefined) {
            return '';
        }

        const extra: string[] = [];
        if (entry.juveniles !== undefined && entry.juveniles > 0) {
            extra.push(`${entry.juveniles} juv`);
        }

        if (entry.calves !== undefined && entry.calves > 0) {
            extra.push(`${entry.calves} calves`);
        }

        if (entry.newborns !== undefined && entry.newborns > 0) {
            extra.push(`${entry.newborns} newborn`);
        }

        return `${entry.species_count}${extra.length > 0 ? ` (${extra.join(', ')})` : ''}`;
    }

    /**
     * _parseIdMapNames — resolve a JSON id-map column (`{"0":"5",...}`) to the
     * list of names the ids map to, skipping unknown ids. Malformed JSON yields
     * an empty list.
     * @param {string} json
     * @param {(id: number) => string | undefined} resolve
     * @returns {string[]}
     * @private
     */
    private static _parseIdMapNames(json: string, resolve: (id: number) => string | undefined): string[] {
        const names: string[] = [];
        let data: unknown;

        try {
            data = JSON.parse(json);
        } catch {
            return names;
        }

        if (!data || typeof data !== 'object') {
            return names;
        }

        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const name = resolve(parseInt(value, 10));
                if (name !== undefined) {
                    names.push(name);
                }
            }
        }

        return names;
    }

}