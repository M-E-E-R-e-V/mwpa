import {Logger} from 'figtree';
import {SettingsRepository} from '../../Db/MariaDb/Repositories/SettingsRepository.js';

/**
 * Persisted AIS configuration. Stored as a single JSON blob in the
 * `settings` table under name='ais_config' so admins can edit values
 * at runtime without a deploy.
 *
 * Defaults are conservative — Canaries bounding box, 90-day live
 * retention, 1-min downsampling — sized so storage stays well under
 * 1 GB even with the default subscription open 24/7.
 */
export type AisConfig = {

    /** Master toggle — when false, the LiveAisService doesn't connect. */
    enabled: boolean;

    /** Days of live ping retention before AisPruneService deletes. */
    live_retention_days: number;

    /** Minimum seconds between two stored pings for the same MMSI. */
    downsample_seconds: number;

    /** SOG delta (knots) that bypasses the time-based downsample. */
    downsample_sog_delta_kn: number;

    /** COG delta (degrees) that bypasses the time-based downsample. */
    downsample_cog_delta_deg: number;

    /** Spatial buffer (metres) for tour-attribution: vessel-ping → boat-track point distance. */
    tour_match_radius_m: number;

    /** Pre/post-tour minutes added to the spatio-temporal window. */
    tour_time_buffer_min: number;

    /** Heading variation (deg) inside the window that flags `course_changed`. */
    course_change_threshold_deg: number;

    /** Subscription bounding box — applied at WebSocket connect time. */
    bbox_min_lat: number;
    bbox_max_lat: number;
    bbox_min_lon: number;
    bbox_max_lon: number;
};

const DEFAULTS: AisConfig = {
    enabled: true,
    live_retention_days: 90,
    downsample_seconds: 60,
    downsample_sog_delta_kn: 2,
    downsample_cog_delta_deg: 15,
    tour_match_radius_m: 5000,
    tour_time_buffer_min: 30,
    course_change_threshold_deg: 30,
    // Canary Islands bounding box (full archipelago, all 8 inhabited
    // + uninhabited islands). Tighten via the admin Settings page if
    // you're operating from a single island and want to reduce noise.
    bbox_min_lat: 27.5,
    bbox_max_lat: 29.5,
    bbox_min_lon: -18.5,
    bbox_max_lon: -13.0
};

const SETTINGS_KEY = 'ais_config';

/**
 * Read / write the AIS configuration row. Reads are uncached — the
 * Settings table is tiny, and the convenience of "edit row → next
 * cron tick uses new value" outweighs the round-trip cost.
 */
export class AisSettings {

    /**
     * Load the config, merging any missing fields with defaults so
     * an admin who only set one value doesn't break the rest.
     */
    public static async load(): Promise<AisConfig> {
        const row = await SettingsRepository.getInstance().findByName(SETTINGS_KEY);
        if (!row || !row.data || row.data === '') {
            return {...DEFAULTS};
        }
        try {
            const parsed = JSON.parse(row.data) as Partial<AisConfig>;
            return {...DEFAULTS, ...parsed};
        } catch (e) {
            Logger.getLogger().warn(
                `AisSettings: failed to parse ais_config row, falling back to defaults — ${(e as Error).message}`
            );
            return {...DEFAULTS};
        }
    }

    public static async save(config: AisConfig): Promise<void> {
        await SettingsRepository.getInstance().setByName(SETTINGS_KEY, JSON.stringify(config));
    }

    public static defaults(): AisConfig {
        return {...DEFAULTS};
    }

}