/**
 * UtilLocationDM
 */
export type UtilLocationDM = {
    direction: string;
    degree: number;
    minute: number;
};

/**
 * UtilLocation
 */
export class UtilLocation {

    /**
     * ddToDm
     * @param coord
     */
    static ddToDm(coord: number, isLat: boolean): UtilLocationDM {
        let direction = '';

        if (isLat) {
            direction = (coord >= 0)? 'N' : 'S';
        } else {
            direction = (coord >= 0)? 'E' : 'W';
        }

        const coordInt = Math.trunc(coord);
        const degree = Math.abs(coordInt);
        const minute = (coord - coordInt) * 0.6;

        return {
            direction,
            degree,
            minute: Math.abs(minute)
        };
    }

}