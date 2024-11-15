/**
 * Description Quake
 */
export type Quake = {
    id: string;
    lat: number;
    lon: number;
    time: number;
    title: string;
    mag: number;
    size: number;
};

/**
 * @see https://www.volcanodiscovery.com/earthquakes/spain/canary-islands.html
 * @see https://www.volcanoesandearthquakes.com/region/Spain
 */
export class Volcanodiscovery {

    /**
     * Support Sub Urls
     */
    public static supportSubUrls: string[][] = [['spain/canary-islands', 'Spain Canary Islands']];

    /**
     * Main url
     */
    public _mainUrl = 'https://www.volcanodiscovery.com/earthquakes';

    public async getQuake(subUrl: string): Promise<Quake[]> {
        const url = `${this._mainUrl}/${subUrl}.html`;

        return [];
    }

    public async getQuakeArchive(subUrl: string, date: Date): Promise<Quake[]> {
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        };

        const formattedDate = date.toLocaleDateString(
            'en-GB',
            options
        ).toLowerCase().replace(',', '-');

        const url = `${this._mainUrl}/${subUrl}/archive/${formattedDate}.html`;

        return [];
    }

}