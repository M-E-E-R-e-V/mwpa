/**
 * Helper list for checking whether a sighting "other" string is a turtle.
 */
export class UtilTurtleList {

    public static turtles: string[] = [
        'Caretta caretta',
        'Dermochelys coriacea',
        'Chelonia mydas',
        'Eretmochelys imbricata',
        'Unknown sea turtle',
        'Eretmochelys imbricata - Hawksbill sea turtle',
        'Chelonia mydas - Green sea turtle',
        'Dermochelys coriacea - Leatherback sea turtle',
        'Caretta caretta - Loggerhead sea turtle'
    ];

    /**
     * Is the sighting "other" text describing a turtle?
     * @param {string} str
     * @returns {boolean}
     */
    public static isTurtle(str: string): boolean {
        return UtilTurtleList.turtles.includes(str.trim());
    }

}