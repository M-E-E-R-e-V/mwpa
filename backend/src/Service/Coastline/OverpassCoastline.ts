import {CoastBbox, LatLon} from '../../Application/CoastlineGeometry.js';

type OverpassAnswer = {
    elements?: {
        type?: string;
        geometry?: {lat: number; lon: number}[];
    }[];
};

/**
 * OverpassCoastline - loads the OpenStreetMap natural=coastline ways of a
 * box from a public Overpass API server (tried in order; the servers are
 * often at capacity, overpass-api.de refuses requests without User-Agent).
 */
export class OverpassCoastline {

    public static readonly SERVERS = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ];

    public static readonly TIMEOUT_MS = 180000;

    public static readonly USER_AGENT = 'MWPA coastline (https://github.com/M-E-E-R-e-V/mwpa)';

    /**
     * Ways of the box as [lat, lon] lists; throws when no server answered.
     */
    public static async fetchWays(bbox: CoastBbox): Promise<LatLon[][]> {
        const query = `[out:json][timeout:150];way["natural"="coastline"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});out geom;`;
        const errors: string[] = [];

        for (const server of OverpassCoastline.SERVERS) {
            const controller = new AbortController();
            const timer = setTimeout((): void => controller.abort(), OverpassCoastline.TIMEOUT_MS);

            try {
                // eslint-disable-next-line no-await-in-loop
                const response = await fetch(server, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': OverpassCoastline.USER_AGENT
                    },
                    body: new URLSearchParams({data: query}).toString()
                });

                // eslint-disable-next-line no-await-in-loop
                const body = await response.text();

                if (response.status !== 200) {
                    errors.push(`${new URL(server).host}: HTTP ${response.status}`);
                    continue;
                }

                return OverpassCoastline.parse(JSON.parse(body) as OverpassAnswer);
            } catch (e) {
                errors.push(`${new URL(server).host}: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                clearTimeout(timer);
            }
        }

        throw new Error(`Overpass: ${errors.join('; ')}`);
    }

    /**
     * Ways of an Overpass "out geom" answer.
     */
    public static parse(answer: OverpassAnswer): LatLon[][] {
        if (!Array.isArray(answer.elements)) {
            throw new Error('Overpass: no elements');
        }

        const ways: LatLon[][] = [];

        for (const el of answer.elements) {
            if (el.type !== 'way' || !Array.isArray(el.geometry)) {
                continue;
            }

            const way = el.geometry
                .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
                .map((p): LatLon => [p.lat, p.lon]);

            if (way.length >= 2) {
                ways.push(way);
            }
        }

        return ways;
    }

}
