
export type FinfindrOption = {
    port: number;
    host: string;
};

/**
 * Findfindr base on whaleRidgeFindR container.
 */
export class Finfindr {

    /**
     * Options for container connection.
     * @member {FinfindrOption}
     */
    protected _options: FinfindrOption;

    /**
     * Constructor for Finfindr.
     * @param {FinfindrOption} options
     */
    public constructor(options: FinfindrOption) {
        this._options = options;
    }

    /**
     * Build the URL to container and endpount.
     * @param {string} endpoint
     * @returns {string}
     */
    protected _getUrl(endpoint: string): string {
        return `http://${this._options.host}:${this._options.port}/${endpoint}`;
    }

    public async checkContainer(): Promise<boolean> {
        const endpoints: string[] = [
            'ocpu/library/finFindR/R/hashFromImage/json',
            'ocpu/library/finFindR/R/distanceToRefParallel/json'
        ];

        for (const endpoint of endpoints) {
            const url = this._getUrl(endpoint);
            console.log(url);
        }

        return false;
    }

}