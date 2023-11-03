import got from 'got';

export type NavionicsQuickinfoMarineResponse = {
    items: {
        details?: boolean;
        id?: string;
        category_id?: string;
        positon?: {
            lat: number;
            lon: number;
        };
        name?: string;
        distance?: string;
        icon_id?: string;
    }[];
};

export type NavionicsDepth = {
    depth_contour?: number;
    depth_area?: {
        from: number;
        until: number;
    };
};

/**
 * @see https://webapiv2.navionics.com/
 */
export class Navionics {

    protected _apiEndpoint: string = 'https://webapp.navionics.com/api/v2';

    public async getWaterDepth(lat: number, lon: number): Promise<NavionicsDepth|null> {
        try {
            const response = await got({
                url: `${this._apiEndpoint}/quickinfo/marine/${lat}/${lon}?dpu=meters&scl=false&z=14&sd=30`,
                responseType: 'json'
            });

            if (response.statusCode === 200) {
                const body = response.body as NavionicsQuickinfoMarineResponse;

                if (body.items) {
                    const resulte: NavionicsDepth = {};

                    for (const item of body.items) {
                        switch (item.category_id) {
                            // eslint-disable-next-line no-lone-blocks
                            case 'depth_contour': {
                                if (item.name) {
                                    const parts = item.name.split('(');

                                    if (parts.length > 1) {
                                        const depthParts = parts[1].split(' ');

                                        if (depthParts.length > 1) {
                                            if (depthParts[1].trim().startsWith('m')) {
                                                resulte.depth_contour = parseInt(depthParts[0], 10);
                                            }
                                        }
                                    }
                                }
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'depth_area': {
                                if (item.name) {
                                    const parts = item.name.split('(');

                                    if (parts.length > 1) {
                                        const depthParts = parts[1].split(' ');

                                        if (depthParts.length > 1) {
                                            if (depthParts[1].trim().startsWith('m')) {
                                                const lenParts = depthParts[0].split('-');

                                                if (lenParts.length === 2) {
                                                    resulte.depth_area = {
                                                        from: parseInt(lenParts[0], 10),
                                                        until: parseInt(lenParts[1], 10)
                                                    };
                                                }
                                            }
                                        }
                                    }
                                }
                            } break;
                        }
                    }

                    return resulte;
                }
            }
        } catch (e) {
            console.log('Navionics::getWaterDepth: Error:');
            console.error(e);
        }

        return null;
    }

}