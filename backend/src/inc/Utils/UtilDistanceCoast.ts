/**
 * UtilDistanceCoast
 */
export class UtilDistanceCoast {

    /**
     * meterToM
     * @param value
     * @param round
     */
    public static meterToM(value: number, round: boolean): string {
        const mValue = 0.5399568035 * (value / 1000);

        if (round) {
            return mValue.toFixed(2);
        }

        return `${mValue}`;
    }

}