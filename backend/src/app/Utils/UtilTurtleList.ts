/**
 * Helper List for check is Sighting a Turtle Sighting
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
     * Is the sighting string other a turtle
     * @param {string} str
     * @returns {boolean}
     */
    public static isTurtle(str: string): boolean {
        return UtilTurtleList.turtles.includes(str.trim());
    }

}