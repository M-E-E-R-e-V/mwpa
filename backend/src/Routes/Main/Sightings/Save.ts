import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {SightingSaveRequest} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {Sighting} from '../../../Db/MariaDb/Entities/Sighting.js';
import {SightingTour} from '../../../Db/MariaDb/Entities/SightingTour.js';

/**
 * Normalise an HH:mm-ish time so string comparison works for ranges that span
 * single-digit hours like "9:30" vs "10:00". Empty input returns ''.
 */
const normaliseTime = (t: string): string => {
    const trimmed = t.trim();
    if (trimmed === '') {
        return '';
    }
    const parts = trimmed.split(':');
    const hh = (parts[0] ?? '0').padStart(2, '0');
    const mm = (parts[1] ?? '00').padStart(2, '0');
    return `${hh}:${mm}`;
};

/**
 * Save
 */
export class Save {

    /**
     * Try to find an existing tour the sighting belongs to. Match: same crew
     * (vehicle + driver), same date, sighting time inside [tour_start, tour_end].
     * Returns null when no tour fits — caller keeps user-entered tour fields.
     */
    private static async _findOwningTour(
        request: SightingSaveRequest,
        sightingTime: string
    ): Promise<SightingTour | null> {
        if (sightingTime === '' || !request.date) {
            return null;
        }

        const candidates = await SightingTourRepository.getInstance().findByCrewAndDate(
            request.vehicle_id,
            request.vehicle_driver_id,
            request.date
        );

        for (const tour of candidates) {
            const start = normaliseTime(tour.tour_start);
            const end = normaliseTime(tour.tour_end);
            if (start === '' || end === '') {
                continue;
            }
            if (sightingTime >= start && sightingTime <= end) {
                return tour;
            }
        }

        return null;
    }

    /**
     * Update an existing (non-deleted) sighting from the modal payload.
     * Caller must verify the right. Only the fields editable in the
     * SightingEditModal are written; preserved as-is: unid, hash, files,
     * organization_id, device_id, source_import_file, behaviours, etc.
     *
     * Auto-linking: when the sighting time (duration_from || tour_start)
     * lies within an existing SightingTour with the same boat + driver on
     * the same date, the sighting is linked to that tour and the user-entered
     * tour_start/tour_end are overwritten with the tour's values.
     * @param {SightingSaveRequest} request
     * @return {DefaultReturn}
     */
    public static async save(request?: SightingSaveRequest): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        if (request.vehicle_id <= 0) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Boat is required.'};
        }
        if (request.vehicle_driver_id <= 0) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Skipper is required.'};
        }
        if (request.species_id <= 0) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Species is required.'};
        }
        const begin = request.location_begin.trim();
        if (begin === '' || begin === 'null') {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Position begin is required.'};
        }

        const sighting = await SightingRepository.getInstance().findOne(request.id);

        if (!sighting || sighting.deleted) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Sighting not found!'
            };
        }

        const sightingTime = normaliseTime(request.duration_from ?? '') || normaliseTime(request.tour_start ?? '');
        const owningTour = await Save._findOwningTour(request, sightingTime);

        Save._applyFields(sighting, request, owningTour);

        await SightingRepository.getInstance().save(sighting);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Copy editable fields from request onto entity. When the sighting matched
     * an existing tour, tour metadata wins over user-entered tour_start/end.
     */
    private static _applyFields(sighting: Sighting, request: SightingSaveRequest, owningTour: SightingTour | null): void {
        sighting.vehicle_id = request.vehicle_id;
        sighting.vehicle_driver_id = request.vehicle_driver_id;
        sighting.beaufort_wind_n = request.beaufort_wind;
        sighting.date = request.date;
        sighting.duration_from = request.duration_from ?? '';
        sighting.duration_until = request.duration_until ?? '';
        sighting.location_begin = request.location_begin;
        sighting.location_end = request.location_end ?? '';
        sighting.species_id = request.species_id;
        sighting.species_count = request.species_count;
        sighting.reaction_id = request.reaction_id;
        sighting.other = request.other ?? '';
        sighting.other_vehicle = request.other_vehicle ?? '';
        sighting.note = request.note ?? '';
        sighting.update_datetime = Math.floor(Date.now() / 1000);

        if (owningTour) {
            sighting.tour_id = owningTour.id;
            sighting.tour_fid = owningTour.tour_fid;
            sighting.tour_start = owningTour.tour_start;
            sighting.tour_end = owningTour.tour_end;
        } else {
            sighting.tour_start = request.tour_start ?? '';
            sighting.tour_end = request.tour_end ?? '';
        }
    }

}