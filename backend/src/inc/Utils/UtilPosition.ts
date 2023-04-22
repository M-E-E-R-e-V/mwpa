
export enum UtilPositionToStr {
    Lat,
    LatDec,
    Lon,
    LonDec,
    Both
}

/**
 * UtilPosition
 */
export class UtilPosition {

    /**
     * getStr
     * @param jsonStr
     * @param strExport
     */
    public static getStr(jsonStr: string, strExport: UtilPositionToStr = UtilPositionToStr.Both): string {
        try {
            const data = JSON.parse(jsonStr);

            if (data) {
                switch (strExport) {
                    case UtilPositionToStr.Lat:
                        return `${UtilPosition.getDMS(data.latitude, false)}`;

                    case UtilPositionToStr.Lon:
                        return `${UtilPosition.getDMS(data.longitude, true)}`;

                    case UtilPositionToStr.LatDec:
                        return `${data.longitude}`;

                    case UtilPositionToStr.LonDec:
                        return `${data.latitude}`;

                    default:
                        return `${UtilPosition.getDMS(data.latitude, false)} - ${UtilPosition.getDMS(
                            data.longitude,
                            true
                        )}`;
                }
            }
        } catch (e) {
            console.log(`UtilPosition::getStr: jsonStr: ${jsonStr}`);
            console.log(e);
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
                ? 'W'
                : 'E';
        } else {
            hemisphere = dd < 0
                ? 'S'
                : 'N';
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