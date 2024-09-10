/**
 * Is my coordinate on land or water?
 * @see https://isitwater.com/
 */
export class IsItWater {

    public static MAX_DAY_REQUEST = 100;
    protected _apiKey: string = '';

    public constructor(apikey: string) {
        this._apiKey = apikey;
    }

    public async isWater(lat: string, lon: string): Promise<boolean> {
        // TODO
        return false;
    }

}