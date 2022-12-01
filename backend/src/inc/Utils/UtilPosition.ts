/**
 * UtilPosition
 */
export class UtilPosition {

    /**
     * getStr
     * @param jsonStr
     */
    public static getStr(jsonStr: string): string {
        const data = JSON.parse(jsonStr);

        if (data) {
            return `${UtilPosition.getDMS(data.longitude, true)} - ${UtilPosition.getDMS(data.latitude, false)}`;
        }

        return '';
    }

    /**
     * _truncate
     * @param n
     * @private
     */
    private static _truncate(n: number): number {
        return n > 0 ? Math.floor(n) : Math.ceil(n);
    }

    /**
     * getDMS
     * @param dd
     * @param isLong
     */
    public static getDMS(dd: number, isLong: boolean): string {
        let hemisphere: string;

        if (isLong) {
            hemisphere = dd < 0
                ? 'S'
                : 'N';
        } else {
            hemisphere = dd < 0
                ? 'W'
                : 'E';
        }

        const absDD = Math.abs(dd);
        const degrees = UtilPosition._truncate(absDD);
        const minutes = UtilPosition._truncate((absDD - degrees) * 60);

        // eslint-disable-next-line no-mixed-operators
        const seconds = ((absDD - degrees - minutes / 60) * 60 ** 2).toFixed(2);

        const dmsArray = [degrees, minutes, seconds, hemisphere];

        return `${dmsArray[3]}: ${dmsArray[0]}° ${dmsArray[1]}' ${dmsArray[2]}"`;
    }

}