/**
 * Render the legacy tri-state select value (0=No, 1=Yes, anything else="Unknown")
 * as a human string. Used by the XLSX export to format columns like calves/photo_taken.
 */
export class UtilSelect {

    /**
     * @param {number} select
     * @return {string}
     */
    public static getSelectStr(select: number): string {
        switch (select) {
            case 0:
                return 'No';
            case 1:
                return 'Yes';
            default:
                return 'Unknown';
        }
    }

}