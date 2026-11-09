/**
 * SightingHistory
 *
 * What the change history tracks of a sighting: the fields a user enters
 * (web dialog / app) plus the derived tour link, coast distance and the
 * delete state. Bookkeeping columns (timestamps, hash, device, sync) are
 * left out.
 */
export class SightingHistory {

    public static readonly TABLE = 'sighting';

    public static readonly FIELDS = [
        'vehicle_id',
        'vehicle_driver_id',
        'beaufort_wind_n',
        'date',
        'tour_id',
        'tour_start',
        'tour_end',
        'duration_from',
        'duration_until',
        'location_begin',
        'location_end',
        'species_id',
        'species_count',
        'reaction_id',
        'photo_taken',
        'distance_coast',
        'distance_coast_estimation_gps',
        'juveniles',
        'calves',
        'newborns',
        'subgroups',
        'group_structure_id',
        'behaviours',
        'freq_behaviour',
        'recognizable_animals',
        'other_species',
        'other',
        'other_vehicle',
        'note',
        'sighting_type',
        'deleted',
        'deletedDescription'
    ] as const;

}