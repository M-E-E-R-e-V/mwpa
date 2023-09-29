import got from 'got';

export type StormglassDataPoint = 'weather' | 'bio' | 'tide' | 'astronomy' | 'solar' | 'elevation';

/**
 * Stormglass
 * @see https://docs.stormglass.io/
 */
export class Stormglass {

    /**
     * API Endpoint.
     * @member {string}
     */
    protected _apiEndpoint: string = 'https://api.stormglass.io/v2';

    /**
     * API Key.
     * @member {string}
     */
    protected _apiKey: string;

    public constructor(apiKey: string) {
        this._apiKey = apiKey;
    }

    public async pointRequest(point: StormglassDataPoint, lat: string, lng: string, params: string, start?: string, end?: string): Promise<void> {
        try {
            let query = '';

            if (start) {
                query += `&start=${start}`;
            }

            if (end) {
                query += `&end=${end}`;
            }

            const response = await got({
                url: `${this._apiEndpoint}/${point}/point?lat=${lat}&lng=${lng}&params=${params}${query}`,
                responseType: 'json',
                headers: {
                    Authorization: this._apiKey
                }
            });

            if (response.body) {
                console.log(response.body);
                /**
                 * {
                 *   "airTemperature": {
                 *     "noaa": 26.53,
                 *     "sg": 26.53
                 *   },
                 *   "cloudCover": {
                 *     "noaa": 0,
                 *     "sg": 0
                 *   },
                 *   "humidity": {
                 *     "noaa": 18,
                 *     "sg": 18
                 *   },
                 *   "pressure": {
                 *     "noaa": 1019.33,
                 *     "sg": 1019.33
                 *   },
                 *   "time": "2023-08-09T12:00:00+00:00",
                 *   "visibility": {
                 *     "noaa": 24.13,
                 *     "sg": 24.13
                 *   },
                 *   "waterTemperature": {
                 *     "noaa": 33.68,
                 *     "sg": 33.68
                 *   },
                 *   "windDirection": {
                 *     "noaa": 95.95,
                 *     "sg": 95.95
                 *   },
                 *   "windSpeed": {
                 *     "noaa": 2.64,
                 *     "sg": 2.64
                 *   }
                 * }
                 */
            }
        } catch (e) {
            console.log('Stormglass::pointRequest: Error:');
            console.error(e);
        }
    }

}