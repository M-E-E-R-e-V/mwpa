import {Logger} from '@stefanwerfling/figtree';
import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {v4 as uuidv4} from 'uuid';
import {Vts} from 'vts';
import {SightingSaveRequest, TypeSighting} from 'mwpa_schemas';
import {CoastDistance} from '../../../Application/CoastDistance.js';
import {SightingSaveFields} from '../../../Application/SightingSaveFields.js';
import {Sighting, SightingType} from '../../../Db/MariaDb/Entities/Sighting.js';
import {SightingTour} from '../../../Db/MariaDb/Entities/SightingTour.js';
import {CoastlineCacheRepository} from '../../../Db/MariaDb/Repositories/CoastlineCacheRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';
import {SightingMovementService} from '../../../Service/Movement/SightingMovementService.js';
import {Users} from '../../../Users/Users.js';
import {UtilSighting} from '../../../Utils/UtilSighting.js';
import {UtilTourFid} from '../../../Utils/UtilTourFid.js';

/**
 * Save
 *
 * POST /json/sightings/save — the web sighting dialog. `id > 0` updates that
 * sighting, `id = 0` creates a new one (the mobile app keeps its own route).
 */
export class Save {

    /**
     * Status of tours created here (closed, like mobile-inserted tours).
     */
    protected static readonly _TOUR_STATUS_CLOSED = 2;

    /**
     * Normalise an HH:mm-ish time so string comparison works for ranges that
     * span single-digit hours like "9:30" vs "10:00". Empty input returns ''.
     * @param {string} t
     * @return {string}
     */
    public static normaliseTime(t: string): string {
        const trimmed = t.trim();

        if (trimmed === '') {
            return '';
        }

        const parts = trimmed.split(':');
        const hh = (parts[0] ?? '0').padStart(2, '0');
        const mm = (parts[1] ?? '00').padStart(2, '0');

        return `${hh}:${mm}`;
    }

    /**
     * Update or create a sighting from the dialog payload. Caller must
     * verify the right (sightings_write).
     *
     * Organisation scoping: a non-admin may only touch sightings of their
     * own organisations and may not move one to a boat of another one. The
     * organisation comes from the boat (sighting.organization_id is only
     * reliably set by the mobile save path).
     *
     * Tour: when the sighting time (duration_from || tour_start) lies within
     * an existing tour of the same boat + skipper on that date, the sighting
     * is linked to it and takes over its tour_start/tour_end. A new sighting
     * without such a tour gets one (grouped by tour_fid, like the app).
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {SightingSaveRequest} request
     * @return {DefaultReturn}
     */
    public static async save(
        userId: number,
        isAdmin: boolean,
        request?: SightingSaveRequest
    ): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
        }

        const problem = SightingSaveFields.check(request);

        if (problem !== null) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: problem};
        }

        const vehicleRepo = VehicleRepository.getInstance();
        const targetVehicle = await vehicleRepo.findOne(request.vehicle_id);

        if (!targetVehicle) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Boat not found!'};
        }

        const isNew = request.id <= 0;
        let sighting: Sighting | null;

        if (isNew) {
            sighting = Save._newSighting(userId, targetVehicle.organization_id);
        } else {
            sighting = await SightingRepository.getInstance().findOne(request.id);

            if (!sighting || sighting.deleted) {
                return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Sighting not found!'};
            }
        }

        if (!isAdmin) {
            const currentVehicle = isNew ? targetVehicle : await vehicleRepo.findOne(sighting.vehicle_id);
            const currentOrg = currentVehicle?.organization_id ?? 0;

            if (!await Users.canAccessOrganization(userId, isAdmin, currentOrg) ||
                !await Users.canAccessOrganization(userId, isAdmin, targetVehicle.organization_id)) {
                return {statusCode: StatusCodes.FORBIDDEN, msg: 'No access to this sighting!'};
            }
        }

        const positionChanged = isNew || sighting.location_begin !== request.location_begin;
        const sightingTime = Save.normaliseTime(request.duration_from ?? '') || Save.normaliseTime(request.tour_start ?? '');
        let tour = await Save._findOwningTour(request, sightingTime);

        Save._applyFields(sighting, request, tour);

        if (isNew && tour === null) {
            tour = await Save._tourForNew(request, userId, targetVehicle.organization_id);
            sighting.tour_id = tour.id;
            sighting.tour_fid = tour.tour_fid;
        }

        if (positionChanged) {
            const distance = await Save._coastDistance(request.location_begin);

            if (distance !== null) {
                sighting.distance_coast = `${Math.round(distance)}`;
            } else if (isNew) {
                sighting.distance_coast = '';
            }
        }

        if (isNew) {
            sighting.hash = await UtilSighting.createHash(request as unknown as TypeSighting);
        }

        const saved = await SightingRepository.getInstance().save(sighting);

        if (isNew) {
            Logger.getLogger().info(`Main/Sightings::save: created sighting id ${saved.id} (tour ${saved.tour_id}) by user ${userId}`);
        }

        // Refresh derived movement data. The service swallows its own
        // errors so a derived-data hiccup never blocks a user save.
        await SightingMovementService.getInstance().rebuildForSighting(saved.id);

        return {statusCode: StatusCodes.OK};
    }

    /**
     * Fresh sighting with the defaults a web entry gets ("unknown" for the
     * yes/no/unknown fields, like an untouched field in the app).
     * @param {number} userId
     * @param {number} organizationId
     * @return {Sighting}
     */
    protected static _newSighting(userId: number, organizationId: number): Sighting {
        const now = Math.floor(Date.now() / 1000);
        const sighting = new Sighting();

        sighting.unid = uuidv4();
        sighting.creater_id = userId;
        sighting.create_datetime = now;
        sighting.update_datetime = now;
        sighting.device_id = 0;
        sighting.beaufort_wind = 0;
        sighting.tour_id = 0;
        sighting.tour_fid = '';
        sighting.photo_taken = 0;
        sighting.distance_coast = '';
        sighting.distance_coast_estimation_gps = 0;
        sighting.juveniles = -1;
        sighting.calves = -1;
        sighting.newborns = -1;
        sighting.subgroups = -1;
        sighting.behaviours = '';
        sighting.group_structure_id = 0;
        sighting.freq_behaviour = '';
        sighting.recognizable_animals = '';
        sighting.other_species = '';
        sighting.hash = '';
        sighting.hash_import_count = 0;
        sighting.source_import_file = '';
        sighting.organization_id = organizationId;
        sighting.sighting_type = SightingType.NORMAL;
        sighting.deleted = false;
        sighting.deletedDescription = '';
        sighting.syncblock = false;

        return sighting;
    }

    /**
     * Existing tour the sighting belongs to: same crew (boat + skipper), same
     * date, sighting time inside [tour_start, tour_end]. Null when none fits.
     * @param {SightingSaveRequest} request
     * @param {string} sightingTime
     * @return {SightingTour|null}
     */
    protected static async _findOwningTour(request: SightingSaveRequest, sightingTime: string): Promise<SightingTour | null> {
        if (sightingTime === '' || !request.date) {
            return null;
        }

        const candidates = await SightingTourRepository.getInstance().findByCrewAndDate(
            request.vehicle_id,
            request.vehicle_driver_id,
            request.date
        );

        for (const tour of candidates) {
            const start = Save.normaliseTime(tour.tour_start);
            const end = Save.normaliseTime(tour.tour_end);

            if (start !== '' && end !== '' && sightingTime >= start && sightingTime <= end) {
                return tour;
            }
        }

        return null;
    }

    /**
     * Tour for a new web sighting without an owning tour: the web tour of
     * the same tour_fid (boat-skipper-date-start) or a new closed one.
     * @param {SightingSaveRequest} request
     * @param {number} userId
     * @param {number} organizationId
     * @return {SightingTour}
     */
    protected static async _tourForNew(request: SightingSaveRequest, userId: number, organizationId: number): Promise<SightingTour> {
        const repository = SightingTourRepository.getInstance();
        const tourFid = UtilTourFid.createTourFid(request as unknown as TypeSighting);
        const existing = await repository.findByTourFidAndDevice(tourFid, 0);

        if (existing) {
            return existing;
        }

        const now = Math.floor(Date.now() / 1000);
        const tour = new SightingTour();

        tour.tour_fid = tourFid;
        tour.creater_id = userId;
        tour.create_datetime = now;
        tour.update_datetime = now;
        tour.vehicle_id = request.vehicle_id;
        tour.vehicle_driver_id = request.vehicle_driver_id;
        tour.beaufort_wind = request.beaufort_wind;
        tour.date = request.date;
        tour.tour_start = request.tour_start ?? '';
        tour.tour_end = request.tour_end ?? '';
        tour.organization_id = organizationId;
        tour.status = Save._TOUR_STATUS_CLOSED;
        tour.record_by_persons = '';
        tour.device_id = 0;

        return repository.save(tour);
    }

    /**
     * Distance in metres from the begin position to the coast lines cached
     * for the app (coastline_cache), null when the area has none (yet).
     * @param {string} locationBegin JSON GeolocationCoordinates
     * @return {number|null}
     */
    protected static async _coastDistance(locationBegin: string): Promise<number | null> {
        let lat: number;
        let lon: number;

        try {
            const position = JSON.parse(locationBegin) as {latitude?: unknown; longitude?: unknown;};
            lat = Number(position.latitude);
            lon = Number(position.longitude);
        } catch {
            return null;
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return null;
        }

        try {
            const areas = await CoastlineCacheRepository.getInstance().findContaining(lat, lon);

            for (const area of areas) {
                const lines = JSON.parse(area.lines ?? '[]') as number[][];
                const distance = CoastDistance.distanceM(lat, lon, lines);

                if (distance !== null) {
                    return distance;
                }
            }
        } catch (e) {
            Logger.getLogger().warn(`Main/Sightings::save: coast distance failed: ${(e as Error).message}`);
        }

        return null;
    }

    /**
     * Copy the dialog fields onto the entity. Detail fields that were not
     * sent keep their value. When the sighting matched an existing tour,
     * the tour metadata wins over the entered tour_start/tour_end.
     * @param {Sighting} sighting
     * @param {SightingSaveRequest} request
     * @param {SightingTour|null} owningTour
     */
    protected static _applyFields(sighting: Sighting, request: SightingSaveRequest, owningTour: SightingTour | null): void {
        sighting.vehicle_id = request.vehicle_id;
        sighting.vehicle_driver_id = request.vehicle_driver_id;
        sighting.beaufort_wind_n = request.beaufort_wind;
        sighting.date = request.date.trim();
        sighting.duration_from = request.duration_from ?? '';
        sighting.duration_until = request.duration_until ?? '';
        sighting.location_begin = request.location_begin;
        sighting.location_end = request.location_end ?? '';
        sighting.species_id = request.species_id;
        sighting.species_count = request.species_count;
        sighting.reaction_id = Math.max(0, request.reaction_id);
        sighting.other = request.other ?? '';
        sighting.other_vehicle = request.other_vehicle ?? '';
        sighting.note = request.note ?? '';
        sighting.update_datetime = Math.floor(Date.now() / 1000);

        Object.assign(sighting, SightingSaveFields.details(request));

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