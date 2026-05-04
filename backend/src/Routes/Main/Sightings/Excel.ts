import moment from 'moment';
import xlsx from 'node-xlsx';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {VehicleDriverRepository} from '../../../Db/MariaDb/Repositories/VehicleDriverRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';
import {UtilDistanceCoast} from '../../../Utils/UtilDistanceCoast.js';
import {UtilPosition, UtilPositionToStr} from '../../../Utils/UtilPosition.js';
import {UtilSelect} from '../../../Utils/UtilSelect.js';

const HEADERS: string[] = [
    'Id',
    'Date',
    'Start of trip',
    'End of trip',
    'Boat',
    'Skipper',
    'Observer',
    'Wind/Seastate (Beaufort)',
    'Species',
    'Number of animals',
    'Duration from',
    'Duration until',
    'Position begin latitude',
    'Position begin longitude',
    'Position end latitude',
    'Position end longitude',
    'Estimation without GPS',
    'Distance to nearst coast (nm)',
    'Juveniles',
    'Calves',
    'Newborns',
    'Behaviour',
    'Group structure',
    'Subgroups',
    'Reaction',
    'Frequent behaviours of individuals',
    'Photos taken',
    'Recognizable animals',
    'Other species',
    'Other',
    'Other boats present',
    'Note'
];

const GROUP_STRUCTURE: Record<number, string> = {
    1: 'widely dispersed',
    2: 'dispersed',
    3: 'loose',
    4: 'tight'
};

/**
 * Parse the JSON-encoded behaviours blob ({k: speciesId-as-string}) into a comma-joined
 * list of behavioural-state names. Mirrors legacy behaviour: silently returns '' on parse error.
 */
const buildBehaviourStr = (raw: string, behStates: Map<number, string>): string => {
    try {
        const data = JSON.parse(raw) as Record<string, unknown> | null;
        if (!data) {
            return '';
        }
        const names: string[] = [];
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const name = behStates.get(parseInt(value, 10));
                if (name) {
                    names.push(name);
                }
            }
        }
        return names.join(', ');
    } catch {
        return '';
    }
};

const buildFreqStr = (raw: string): string => {
    try {
        const data = JSON.parse(raw) as Record<string, unknown> | null;
        if (!data) {
            return '';
        }
        const items: string[] = [];
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                items.push(value);
            }
        }
        return items.join(', ');
    } catch {
        return '';
    }
};

const buildOtherSpeciesStr = (raw: string, species: Map<number, string>): string => {
    try {
        const data = JSON.parse(raw) as Record<string, unknown> | null;
        if (!data) {
            return '';
        }
        const names: string[] = [];
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const name = species.get(parseInt(value, 10));
                if (name) {
                    names.push(name);
                }
            }
        }
        return names.join(', ');
    } catch {
        return '';
    }
};

/**
 * Build the sightings XLSX export.
 * Wire-compatible with the legacy /json/sightings/list/excel handler:
 * - same column order, same labels, same value formatting (calves/photo_taken via UtilSelect,
 *   distance via UtilDistanceCoast, lat/lon via UtilPosition with the legacy LatDec/LonDec swap).
 * - same row scope: every non-deleted sighting, ordered date desc, tour_start desc.
 */
export class Excel {

    /**
     * @return {Buffer}
     */
    public static async build(): Promise<Buffer> {
        const sightingRepository = SightingRepository.getInstance();

        const [
            vehicles,
            drivers,
            speciesAll,
            users,
            behStates,
            encounterCategories
        ] = await Promise.all([
            VehicleRepository.getInstance().findAll(),
            VehicleDriverRepository.getInstance().findAllWithUser(),
            SpeciesRepository.getInstance().findAll(),
            UserRepository.getInstance().findAll(),
            BehaviouralStatesRepository.getInstance().findAll(),
            EncounterCategoriesRepository.getInstance().findAll()
        ]);

        const vehiclesById = new Map<number, string>();
        for (const v of vehicles) {
            vehiclesById.set(v.id, v.description);
        }

        const driversById = new Map<number, string>();
        for (const d of drivers) {
            driversById.set(d.id, d.user_full_name);
        }

        const speciesNamesById = new Map<number, string>();
        for (const s of speciesAll) {
            speciesNamesById.set(s.id, s.name);
        }

        const usersById = new Map<number, string>();
        for (const u of users) {
            usersById.set(u.id, u.full_name);
        }

        const behStatesById = new Map<number, string>();
        for (const b of behStates) {
            behStatesById.set(b.id, b.name);
        }

        const enCatsById = new Map<number, string>();
        for (const c of encounterCategories) {
            enCatsById.set(c.id, c.name);
        }

        const {rows} = await sightingRepository.findActiveList(
            {
                date: 'DESC',
                tour_start: 'DESC'
            }
        );

        const data: (string|number)[][] = [HEADERS];

        for (const entry of rows) {
            const positionBeginLat = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LatDec);
            const positionBeginLon = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LonDec);
            const positionEndLat = UtilPosition.getStr(entry.location_end, UtilPositionToStr.LatDec);
            const positionEndLon = UtilPosition.getStr(entry.location_end, UtilPositionToStr.LonDec);
            const distance = UtilDistanceCoast.meterToM(parseFloat(entry.distance_coast) || 0.0, true);
            const date = moment(entry.date);
            const speciesName = (speciesNamesById.get(entry.species_id) ?? '').split(',')[0];
            const beaufortWind = entry.beaufort_wind_n !== ''
                ? entry.beaufort_wind_n
                : `${entry.beaufort_wind}`;

            data.push([
                `${entry.id}`,
                `${date.format('YYYY/MM/DD')}`,
                `${entry.tour_start}`,
                `${entry.tour_end}`,
                `${vehiclesById.get(entry.vehicle_id) ?? ''}`,
                `${driversById.get(entry.vehicle_driver_id) ?? ''}`,
                `${usersById.get(entry.creater_id) ?? ''}`,
                `${beaufortWind}`,
                speciesName,
                `${entry.species_count}`,
                `${entry.duration_from}`,
                `${entry.duration_until}`,
                `${positionBeginLat}`,
                `${positionBeginLon}`,
                `${positionEndLat}`,
                `${positionEndLon}`,
                UtilSelect.getSelectStr(entry.distance_coast_estimation_gps),
                distance,
                UtilSelect.getSelectStr(entry.juveniles),
                UtilSelect.getSelectStr(entry.calves),
                UtilSelect.getSelectStr(entry.newborns),
                buildBehaviourStr(entry.behaviours, behStatesById),
                GROUP_STRUCTURE[entry.group_structure_id] ?? '',
                UtilSelect.getSelectStr(entry.subgroups),
                enCatsById.get(entry.reaction_id) ?? '',
                buildFreqStr(entry.freq_behaviour),
                UtilSelect.getSelectStr(entry.photo_taken),
                `${entry.recognizable_animals}`,
                buildOtherSpeciesStr(entry.other_species, speciesNamesById),
                `${entry.other}`,
                `${entry.other_vehicle}`,
                `${entry.note}`
            ]);
        }

        return xlsx.build([{
            name: 'Sightings',
            data,
            options: {}
        }]);
    }

}