import fs from 'fs';
import {StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {
    ToursTrackingRequest,
    ToursTrackingResponse,
    ToursTrackingSightingData,
    ToursTrackingSightingExtended
} from 'mwpa_schemas';
import {SightingExtendedRepository} from '../../../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {UtilTurtleList} from '../../../Utils/UtilTurtleList.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';
import {List as SpeciesList} from '../Species/List.js';

/**
 * Tracking
 */
export class Tracking {

    /**
     * Return all sightings + tracking points for a tour, plus image filenames on disk.
     * @param {ToursTrackingRequest} request
     * @return {ToursTrackingResponse}
     */
    public static async getTracking(request?: ToursTrackingRequest): Promise<ToursTrackingResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const tour = await SightingTourRepository.getInstance().findOne(request.tour_id);

        if (!tour) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Tour not found by ID!'
            };
        }

        const tracks = await SightingTourTrackingRepository.getInstance().findByTour(tour.id);
        const positionList = tracks.map((track) => track.position);

        const sightings = await SightingRepository.getInstance().findByTourFid(tour.tour_fid);

        const speciesList = await SpeciesList.getSpeciesList();
        const speciesMap = new Map<number, typeof speciesList[number]>();
        for (const species of speciesList) {
            speciesMap.set(species.id, species);
        }

        const sightList: ToursTrackingSightingData[] = [];

        for (const sighting of sightings) {
            const species = sighting.species_id !== undefined ? speciesMap.get(sighting.species_id) : undefined;
            let pointtype = 'none';
            let speciesName = '';

            if (species) {
                if (species.species_group) {
                    pointtype = species.species_group.name.toLowerCase();
                }
            } else if (sighting.other) {
                if (UtilTurtleList.isTurtle(sighting.other)) {
                    pointtype = 'testudines';
                    speciesName = sighting.other;
                }
            }

            let files: string[] = [];
            const sightingDir = await UtilUploadPath.getSightingDirectory(sighting.unid);

            if (sightingDir) {
                try {
                    files = fs.readdirSync(sightingDir);
                } catch {
                    files = [];
                }
            }

            const extendeds = await SightingExtendedRepository.getInstance().findBySighting(sighting.id);
            const extendedList: ToursTrackingSightingExtended[] = extendeds.map((ext) => ({
                unid: ext.unid,
                name: ext.name,
                data: ext.data
            }));

            sightList.push({
                id: sighting.id,
                location_begin: sighting.location_begin,
                location_end: sighting.location_end,
                pointtype,
                species_id: sighting.species_id,
                species_name: speciesName,
                species_count: sighting.species_count,
                distance_coast: sighting.distance_coast,
                files,
                extended: extendedList
            });
        }

        return {
            statusCode: StatusCodes.OK,
            tracking: {
                date: tour.date,
                start: tour.tour_start,
                end: tour.tour_end,
                positions: positionList,
                sightings: sightList,
                org_id: tour.organization_id
            }
        };
    }

}