
export class UtilSelect {

    /**
     * getSelectStr
     * @param select
     */
    public static getSelectStr(select: number): string {
        switch (select) {
            case 0:
                return 'No';

            case 1:
                return 'Yes';
        }

        return 'Unknown';
    }

}