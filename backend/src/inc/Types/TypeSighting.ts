/**
 * TypeSighting
 */
export type TypeSighting = {
    unid?: string;
    vehicle_id?: number;
    vehicle_driver_id?: number;
    beaufort_wind?: string;
    date?: string;
    tour_start?: string;
    tour_end?: string;
    duration_from?: string;
    duration_until?: string;
    location_begin?: string;
    location_end?: string;
    photo_taken?: number;
    distance_coast?: string;
    distance_coast_estimation_gps?: number;
    species_id?: number;
    species_count?: number;
    juveniles?: number;
    calves?: number;
    newborns?: number;
    behaviours?: string;
    subgroups?: number;
    group_structure_id?: number;
    reaction_id?: number;
    freq_behaviour?: string;
    recognizable_animals?: string;
    other_species?: string;
    other?: string;
    other_vehicle?: string;
    note?: string;
};