import {TypeSighting} from 'mwpa_schemas';

/**
 * Decomposed tour_fid. `tour_start` is in HH:mm.
 */
export interface ParsedTourFid {
    vehicle_id: number;
    vehicle_driver_id: number;
    date: string;
    tour_start: string;
}

/**
 * UtilTourFid
 */
export class UtilTourFid {

    /**
     * Build a tour foreign id from sighting fields. Used by mobile sync to
     * group multiple sightings into the same tour without creating duplicates.
     * @param {TypeSighting} sighting
     * @return {string}
     */
    public static createTourFid(sighting: TypeSighting): string {
        return `${sighting.vehicle_id}-${sighting.vehicle_driver_id}-${sighting.date}-${sighting.tour_start}`;
    }

    /**
     * Split a tour_fid back into its components. Inverse of {@link createTourFid}.
     * Format is `${vehicle_id}-${vehicle_driver_id}-${yyyy-MM-dd}-${HH:mm}`, so
     * split('-') yields six parts: ids, the three date pieces, and the time.
     * Returns null when the shape doesn't match (e.g. legacy/corrupt fids).
     *
     * @param {string} tourFid
     * @return {ParsedTourFid | null}
     */
    public static parseTourFid(tourFid: string): ParsedTourFid | null {
        const parts = tourFid.split('-');
        if (parts.length !== 6) {
            return null;
        }

        const vehicleId = Number.parseInt(parts[0], 10);
        const vehicleDriverId = Number.parseInt(parts[1], 10);

        if (!Number.isFinite(vehicleId) || !Number.isFinite(vehicleDriverId)) {
            return null;
        }

        const date = `${parts[2]}-${parts[3]}-${parts[4]}`;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return null;
        }

        const tourStart = parts[5];
        if (!/^\d{2}:\d{2}$/.test(tourStart)) {
            return null;
        }

        return {
            vehicle_id: vehicleId,
            vehicle_driver_id: vehicleDriverId,
            date,
            tour_start: tourStart
        };
    }

}