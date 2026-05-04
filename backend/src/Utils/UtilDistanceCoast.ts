/**
 * Distance helpers (meters → nautical miles).
 */
export class UtilDistanceCoast {

    /**
     * Convert meters to nautical miles. The factor (0.5399568035 / 1000) matches
     * the legacy backend so values printed in the XLSX export stay byte-identical.
     * @param {number} value meters
     * @param {boolean} round if true, format to two decimal places
     * @return {string}
     */
    public static meterToM(value: number, round: boolean): string {
        const mValue = 0.5399568035 * (value / 1000);

        if (round) {
            return mValue.toFixed(2);
        }

        return `${mValue}`;
    }

}