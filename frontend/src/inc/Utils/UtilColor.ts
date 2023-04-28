/**
 * UtilColor
 */
export class UtilColor {

    /**
     * getColor
     * @param text
     */
    public static getColor(text: string): string {
        let hash = 0;

        for (let i = 0; i < text.length; i++) {
            // eslint-disable-next-line no-bitwise
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
            // eslint-disable-next-line no-bitwise
            hash &= hash;
        }

        let color = '#';

        for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-bitwise
            const value = (hash >> (i * 8)) & 255;

            color += `00${value.toString(16)}`.substr(-2);
        }

        return color;
    }

    public static getContrastYIQ(hexcolor: string){
        const r = parseInt(hexcolor.substring(1,3),16);
        const g = parseInt(hexcolor.substring(3,5),16);
        const b = parseInt(hexcolor.substring(5,7),16);

        const yiq = ((r*299)+(g*587)+(b*114))/1000;

        return (yiq >= 128) ? 'black' : 'white';
    }
}