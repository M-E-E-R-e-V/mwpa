/**
 * NameCorection
 */
export class NameCorection {

    /**
     * renameUpperChars
     * @param name
     */
    public static renameUpperChars(name: string): string {
        let newName = '';

        if (name && (name.length >= 2)) {
            const tname = name.toLowerCase();
            const parts = tname.split(' ');

            for (const apart of parts) {
                if (newName.length > 0) {
                    newName += ' ';
                }

                newName += apart.charAt(0).toUpperCase() + apart.slice(1);
            }
        }

        return newName;
    }

}