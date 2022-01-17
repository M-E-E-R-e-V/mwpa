/**
 * NameCorection
 */
export class NameCorection {

    /**
     * renameUpperChars
     * @param name
     */
    public static renameUpperChars(name: string): string {
        const tname = name.toLowerCase();
        const parts = tname.split(' ');

        let newName = '';

        for (const apart of parts) {
            if (newName.length > 0) {
                newName += ' ';
            }

            newName += apart.charAt(0).toUpperCase() + apart.slice(1);
        }

        return newName;
    }

}