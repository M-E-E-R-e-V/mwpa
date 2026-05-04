/**
 * Format selector for {@link UtilPosition.getStr}.
 *
 * NOTE: the LatDec/LonDec cases in old-backend swap latitude and longitude
 * (LatDec returns longitude, LonDec returns latitude). The port keeps that
 * swap so generated XLSX reports match the legacy output. Don't "fix" without
 * also updating the callers.
 */
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
     * Format a JSON-encoded position string into one of the formats above.
     * Returns '' on parse error.
     * @param {string} jsonStr
     * @param {UtilPositionToStr} strExport
     * @return {string}
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
                        // Legacy swap — returns longitude. See note on enum.
                        return `${data.longitude}`;

                    case UtilPositionToStr.LonDec:
                        // Legacy swap — returns latitude. See note on enum.
                        return `${data.latitude}`;

                    default:
                        return `${UtilPosition.getDMS(data.latitude, false)} - ${UtilPosition.getDMS(data.longitude, true)}`;
                }
            }
        } catch {
            // ignore — return ''
        }

        return '';
    }

    private static _truncate(n: number): number {
        return n > 0 ? Math.floor(n) : Math.ceil(n);
    }

    /**
     * Format a decimal degree value as DMS with hemisphere prefix, e.g. "N: 28° 5' 36.00\"".
     * @param {number} dd
     * @param {boolean} isLong
     * @return {string}
     */
    public static getDMS(dd: number, isLong: boolean): string {
        const hemisphere = isLong
            ? (dd < 0 ? 'W' : 'E')
            : (dd < 0 ? 'S' : 'N');

        const absDD = Math.abs(dd);
        const degrees = UtilPosition._truncate(absDD);
        const minutes = UtilPosition._truncate((absDD - degrees) * 60);
        const seconds = ((absDD - degrees - minutes / 60) * 3600).toFixed(2);

        return `${hemisphere}: ${degrees}° ${minutes}' ${seconds}"`;
    }

}