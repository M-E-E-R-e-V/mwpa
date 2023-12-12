/**
 * DateHelper
 */
export class DateHelper {

    /**
     * getCurrentDbTime
     */
    public static getCurrentDbTime(): number {
        const tdate = new Date();
        return tdate.getTime() / 1000;
    }

    /**
     * stdTimezoneOffset
     * @param adate
     */
    public static stdTimezoneOffset(adate: Date): number {
        const jan = new Date(adate.getFullYear(), 0, 1);
        const jul = new Date(adate.getFullYear(), 6, 1);

        return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    }

    /**
     * isDstObserved
     * @param adate
     */
    public static isDstObserved(adate: Date): boolean {
        return adate.getTimezoneOffset() < DateHelper.stdTimezoneOffset(adate);
    }

    /**
     * isDateOverTime
     * @param aDate
     * @param toDate
     */
    public static isDateOverTime(aDate: Date, toDate: Date): boolean {
        if (aDate.getTime() < toDate.getTime()) {
            return true;
        }

        return false;
    }

}