/**
 * Format selector for {@link UtilPosition.getStr}.
 *
 * Historical note: the legacy old-backend implementation of LatDec/LonDec
 * actually returned the *opposite* axis (LatDec → longitude, LonDec →
 * latitude). XLSX consumers had been wired around that swap for years.
 * Fixed 2026-05-08: LatDec now returns the latitude, LonDec the longitude.
 * The Excel sheet documents the change in its second "Info" tab; the
 * OfficeReport export was updated in lockstep so its column meaning stays
 * the same.
 */
export enum UtilPositionToStr {
    Lat,
    LatDec,
    LatDM,
    Lon,
    LonDec,
    LonDM,
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
                        return `${data.latitude}`;

                    case UtilPositionToStr.LonDec:
                        return `${data.longitude}`;

                    case UtilPositionToStr.LatDM:
                        return `${UtilPosition.getDM(data.latitude, false)}`;

                    case UtilPositionToStr.LonDM:
                        return `${UtilPosition.getDM(data.longitude, true)}`;

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

    /**
     * Format a decimal degree value as DM (Degrees + decimal Minutes) with hemisphere
     * suffix, e.g. "28° 7.40' N". Two decimal places on the minutes.
     * @param {number} dd
     * @param {boolean} isLong
     * @return {string}
     */
    public static getDM(dd: number, isLong: boolean): string {
        const hemisphere = isLong
            ? (dd < 0 ? 'W' : 'E')
            : (dd < 0 ? 'S' : 'N');

        const absDD = Math.abs(dd);
        const degrees = UtilPosition._truncate(absDD);
        const minutes = ((absDD - degrees) * 60).toFixed(2);

        return `${degrees}° ${minutes}' ${hemisphere}`;
    }

}