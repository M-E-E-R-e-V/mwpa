import {CoastBbox} from '../../Application/CoastlineGeometry.js';

/**
 * GeoJSON geometry as delivered by the EEA service (Polygon / MultiPolygon).
 */
export type Natura2000Geometry = {
    type: string;
    coordinates: unknown;
};

/**
 * One Natura 2000 site.
 */
export type Natura2000Feature = {
    type: 'Feature';
    properties: {
        code: string;
        name: string;

        /**
         * A = Birds Directive (SPA / ZEPA), B = Habitats Directive (SCI, SAC /
         * LIC, ZEC), C = both.
         */
        site_type: string;
        area_km2: number;
        url: string;
    };
    geometry: Natura2000Geometry;
};

export type Natura2000Collection = {
    type: 'FeatureCollection';
    features: Natura2000Feature[];
};

type EeaAnswer = {
    error?: {message?: string;};
    features?: {
        properties?: Record<string, unknown> | null;
        geometry?: Natura2000Geometry | null;
    }[];
};

/**
 * Natura2000Sites - loads the Natura 2000 sites of a box from the public
 * EEA map service (ArcGIS REST, layers "Habitats Directive Sites" and
 * "Birds Directive Sites"), merged by site code and simplified to ~20 m.
 */
export class Natura2000Sites {

    public static readonly SERVICE = 'https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer';

    /**
     * Layer ids: 0 = Habitats Directive, 1 = Birds Directive.
     */
    public static readonly LAYERS = [0, 1];

    /**
     * Simplification in degrees (~20 m).
     */
    public static readonly MAX_OFFSET_DEG = 0.0002;

    public static readonly TIMEOUT_MS = 120000;

    public static readonly SOURCE = 'EEA Natura 2000';

    /**
     * Sites intersecting the box; throws when the service fails.
     * @param {CoastBbox} bbox
     * @return {Natura2000Collection}
     */
    public static async fetch(bbox: CoastBbox): Promise<Natura2000Collection> {
        const answers: EeaAnswer[] = [];

        for (const layer of Natura2000Sites.LAYERS) {
            // eslint-disable-next-line no-await-in-loop
            answers.push(await Natura2000Sites._query(layer, bbox));
        }

        return Natura2000Sites.merge(answers);
    }

    /**
     * Query one layer.
     * @param {number} layer
     * @param {CoastBbox} bbox
     * @return {EeaAnswer}
     * @protected
     */
    protected static async _query(layer: number, bbox: CoastBbox): Promise<EeaAnswer> {
        const params = new URLSearchParams({
            geometry: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
            geometryType: 'esriGeometryEnvelope',
            inSR: '4326',
            spatialRel: 'esriSpatialRelIntersects',
            outFields: 'SITECODE,SITENAME,SITETYPE,Area_km2',
            returnGeometry: 'true',
            outSR: '4326',
            maxAllowableOffset: `${Natura2000Sites.MAX_OFFSET_DEG}`,
            geometryPrecision: '5',
            f: 'geojson'
        });

        const controller = new AbortController();
        const timer = setTimeout((): void => controller.abort(), Natura2000Sites.TIMEOUT_MS);

        try {
            const response = await fetch(`${Natura2000Sites.SERVICE}/${layer}/query?${params.toString()}`, {
                signal: controller.signal,
                headers: {Accept: 'application/json'}
            });

            if (response.status !== 200) {
                throw new Error(`EEA layer ${layer}: HTTP ${response.status}`);
            }

            const answer = await response.json() as EeaAnswer;

            if (answer.error) {
                throw new Error(`EEA layer ${layer}: ${answer.error.message ?? 'error'}`);
            }

            return answer;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Merge the layer answers into one collection, one feature per site code
     * (sites of type C are in both layers).
     * @param {EeaAnswer[]} answers
     * @return {Natura2000Collection}
     */
    public static merge(answers: EeaAnswer[]): Natura2000Collection {
        const byCode = new Map<string, Natura2000Feature>();

        for (const answer of answers) {
            if (!Array.isArray(answer.features)) {
                throw new Error('EEA: no features');
            }

            for (const feature of answer.features) {
                const props = feature.properties ?? {};
                const code = `${props.SITECODE ?? ''}`.trim();
                const geometry = feature.geometry;

                if (code === '' || byCode.has(code) || !geometry ||
                    (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
                    continue;
                }

                const area = Number(props.Area_km2);

                byCode.set(code, {
                    type: 'Feature',
                    properties: {
                        code,
                        name: `${props.SITENAME ?? ''}`.trim(),
                        site_type: `${props.SITETYPE ?? ''}`.trim(),
                        area_km2: Number.isFinite(area) ? Math.round(area * 100) / 100 : 0,
                        url: `https://natura2000.eea.europa.eu/Natura2000/SDF.aspx?site=${encodeURIComponent(code)}`
                    },
                    geometry
                });
            }
        }

        return {
            type: 'FeatureCollection',
            features: [...byCode.values()].sort((a, b) => a.properties.name.localeCompare(b.properties.name))
        };
    }

}