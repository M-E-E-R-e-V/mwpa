/**
 * Result of a successful depth lookup.
 */
export type DepthInfo = {

    /**
     * Sea depth at the requested coordinate, in metres (positive number).
     */
    depth_m: number;

    /**
     * Provider id that produced the value (e.g. 'emodnet', 'noaa_etopo').
     */
    provider: string;

    /**
     * Epoch ms when the value was fetched.
     */
    fetched_at: number;

};

/**
 * Bathymetry provider — wraps a single upstream API.
 * Implementations own their own rate limiter and retry policy.
 */
export interface BathymetryProvider {

    /**
     * Stable provider id, also stored in DepthInfo.provider.
     */
    getName(): string;

    /**
     * True if this provider has coverage for the given coordinate.
     * The registry uses this to pick the most accurate provider per point.
     */
    supports(latitude: number, longitude: number): boolean;

    /**
     * Fetch the depth for (latitude, longitude). Returns null if the upstream
     * has no value for the point (e.g. land, outside coverage), or throws on
     * network/HTTP errors so the caller can decide whether to retry later.
     */
    getDepth(latitude: number, longitude: number): Promise<DepthInfo | null>;

}