import {SightingDetailsGroup, SightingDetailsItem, SightingDetailsSection} from 'mwpa_schemas';
import {Earthquake} from '../../Db/MariaDb/Entities/Earthquake.js';
import {Sighting} from '../../Db/MariaDb/Entities/Sighting.js';
import {SightingEnrichment} from '../../Db/MariaDb/Entities/SightingEnrichment.js';
import {SightingExtended} from '../../Db/MariaDb/Entities/SightingExtended.js';
import {SightingFishingEffort} from '../../Db/MariaDb/Entities/SightingFishingEffort.js';
import {SightingFishingVessel} from '../../Db/MariaDb/Entities/SightingFishingVessel.js';
import {SightingMovement} from '../../Db/MariaDb/Entities/SightingMovement.js';
import {SightingSeismic} from '../../Db/MariaDb/Entities/SightingSeismic.js';

/**
 * Everything the computed-data view of one sighting is built from; derived
 * rows are null / empty when the service hasn't produced them (yet).
 */
export type SightingDetailsInput = {
    sighting: Sighting;
    creatorName: string;
    deviceName: string;
    organizationName: string;
    extended: SightingExtended | null;
    enrichment: SightingEnrichment | null;
    effort: SightingFishingEffort | null;
    vessels: SightingFishingVessel[];
    movement: SightingMovement | null;
    seismic: {link: SightingSeismic; quake: Earthquake | null;}[];
};

/**
 * SightingDetailsBuilder
 *
 * Pure (DB-free) assembly of the read-only "Computed" tab of the sighting
 * dialog: meta data plus the values of the background services (depth,
 * weather, ocean, enrichment, fishing, movement, earthquakes), grouped per
 * source with its status and last update. Labels, column titles and
 * translatable values are English source texts; values are formatted
 * here (fixed decimals), '' means "no value". Unit 'unix' marks a unix
 * seconds value the UI shows as local date / time.
 */
export class SightingDetailsBuilder {

    public static readonly UNIX = 'unix';

    /**
     * Number with fixed decimals, '' for null / empty / not finite. Accepts
     * the strings TypeORM returns for decimal / bigint columns.
     * @param {unknown} value
     * @param {number} decimals
     * @return {string}
     */
    public static num(value: unknown, decimals: number = 0): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        const n = Number(value);
        return Number.isFinite(n) ? n.toFixed(decimals) : '';
    }

    /**
     * Unix seconds of a Date / unix seconds value (0 when missing).
     * @param {Date|number|string|null|undefined} value
     * @return {number}
     */
    public static seconds(value: Date | number | string | null | undefined): number {
        if (value instanceof Date) {
            const ms = value.getTime();
            return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
        }

        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }

    /**
     * All sections of the computed-data tab.
     * @param {SightingDetailsInput} input
     * @return {SightingDetailsSection[]}
     */
    public static build(input: SightingDetailsInput): SightingDetailsSection[] {
        return [
            SightingDetailsBuilder._meta(input),
            SightingDetailsBuilder._weather(input),
            SightingDetailsBuilder._sea(input),
            SightingDetailsBuilder._astro(input),
            SightingDetailsBuilder._human(input),
            SightingDetailsBuilder._movement(input),
            SightingDetailsBuilder._seismic(input)
        ];
    }

    /**
     * One-value item.
     * @param {string} label
     * @param {string} value
     * @param {string} unit
     * @param {boolean} translate
     * @return {SightingDetailsItem}
     */
    protected static _item(label: string, value: string, unit: string = '', translate: boolean = false): SightingDetailsItem {
        return {label: label, values: [value], unit: unit, translate: translate};
    }

    /**
     * Group of items.
     * @param {string} title
     * @param {string} status
     * @param {number} updated
     * @param {SightingDetailsItem[]} items
     * @param {string[]} columns
     * @return {SightingDetailsGroup}
     */
    protected static _group(
        title: string,
        status: string,
        updated: number,
        items: SightingDetailsItem[],
        columns: string[] = []
    ): SightingDetailsGroup {
        return {title: title, title_raw: false, status: status, updated: updated, columns: columns, items: items};
    }

    protected static _meta(input: SightingDetailsInput): SightingDetailsSection {
        const s = input.sighting;
        const ext = input.extended;
        const types = ['Normal', 'Short entry', 'Notice', 'Free entry'];

        return {
            key: 'meta',
            title: 'Meta',
            groups: [
                SightingDetailsBuilder._group('Record', '', SightingDetailsBuilder.seconds(s.update_datetime), [
                    SightingDetailsBuilder._item('ID', `${s.id}`),
                    SightingDetailsBuilder._item('UUID', s.unid),
                    SightingDetailsBuilder._item('Created by', input.creatorName),
                    SightingDetailsBuilder._item('Created at', SightingDetailsBuilder.num(s.create_datetime), SightingDetailsBuilder.UNIX),
                    SightingDetailsBuilder._item('Updated at', SightingDetailsBuilder.num(s.update_datetime), SightingDetailsBuilder.UNIX),
                    SightingDetailsBuilder._item('Source', s.device_id > 0 ? input.deviceName : 'Web', '', s.device_id === 0),
                    SightingDetailsBuilder._item('Organization', input.organizationName),
                    SightingDetailsBuilder._item('Tour', s.tour_id > 0 ? `#${s.tour_id}` : ''),
                    SightingDetailsBuilder._item('Tour FID', s.tour_fid),
                    SightingDetailsBuilder._item('Sighting type', types[s.sighting_type] ?? `${s.sighting_type}`, '', true),
                    SightingDetailsBuilder._item('Import file', s.source_import_file),
                    SightingDetailsBuilder._item('Sync blocked', s.syncblock ? 'Yes' : 'No', '', true)
                ]),
                SightingDetailsBuilder._group(
                    'Position quality',
                    ext?.coord_uncert_status ?? '',
                    SightingDetailsBuilder.seconds(ext?.coord_uncert_last_update),
                    [SightingDetailsBuilder._item('Coordinate uncertainty', SightingDetailsBuilder.num(ext?.coordinate_uncertainty_m), 'm')]
                )
            ]
        };
    }

    protected static _weather(input: SightingDetailsInput): SightingDetailsSection {
        const ext = input.extended;
        const enr = input.enrichment;
        const pair = (label: string, day: unknown, hour: unknown, unit: string, decimals: number): SightingDetailsItem => ({
            label: label,
            values: [SightingDetailsBuilder.num(day, decimals), SightingDetailsBuilder.num(hour, decimals)],
            unit: unit,
            translate: false
        });
        const hour = ext?.weather_hour_used;

        return {
            key: 'weather',
            title: 'Weather',
            groups: [
                SightingDetailsBuilder._group('Weather', ext?.weather_status ?? '', SightingDetailsBuilder.seconds(ext?.weather_last_update), [
                    pair('Air temperature', ext?.air_temperature_c_day, ext?.air_temperature_c_hour, '°C', 1),
                    pair('Wind speed', ext?.wind_speed_m_s_day, ext?.wind_speed_m_s_hour, 'm/s', 1),
                    pair('Wind direction', ext?.wind_direction_deg_day, ext?.wind_direction_deg_hour, '°', 0),
                    pair('Wind gusts', ext?.wind_gusts_m_s_day, ext?.wind_gusts_m_s_hour, 'm/s', 1),
                    pair('Wave height', ext?.wave_height_m_day, ext?.wave_height_m_hour, 'm', 2),
                    pair('Wave period', ext?.wave_period_s_day, ext?.wave_period_s_hour, 's', 1),
                    pair('Wave direction', ext?.wave_direction_deg_day, ext?.wave_direction_deg_hour, '°', 0),
                    pair('UV index', ext?.uv_index_day, ext?.uv_index_hour, '', 1),
                    {
                        label: 'Hour used',
                        values: ['', hour === null || hour === undefined ? '' : `${`${hour}`.padStart(2, '0')}:00`],
                        unit: '',
                        translate: false
                    }
                ], ['Day mean', 'At hour']),
                SightingDetailsBuilder._group('Atmosphere', enr?.meteo_status ?? '', SightingDetailsBuilder.seconds(enr?.enrichment_last_update), [
                    SightingDetailsBuilder._item('Air pressure (sea level)', SightingDetailsBuilder.num(enr?.pressure_msl_hpa_day, 1), 'hPa'),
                    SightingDetailsBuilder._item('Cloud cover', SightingDetailsBuilder.num(enr?.cloud_cover_pct_day), '%'),
                    SightingDetailsBuilder._item('Visibility', SightingDetailsBuilder.num(
                        enr?.visibility_m_day === null || enr?.visibility_m_day === undefined ? null : Number(enr.visibility_m_day) / 1000,
                        1
                    ), 'km'),
                    SightingDetailsBuilder._item('Precipitation', SightingDetailsBuilder.num(enr?.precipitation_mm_day, 1), 'mm')
                ])
            ]
        };
    }

    protected static _sea(input: SightingDetailsInput): SightingDetailsSection {
        const ext = input.extended;
        const enr = input.enrichment;
        const sci = (value: unknown): string => {
            const n = value === null || value === undefined || value === '' ? NaN : Number(value);
            return Number.isFinite(n) ? n.toExponential(2) : '';
        };

        return {
            key: 'sea',
            title: 'Sea',
            groups: [
                SightingDetailsBuilder._group('Depth & seabed', ext?.depth_status ?? '', SightingDetailsBuilder.seconds(ext?.depth_last_update), [
                    SightingDetailsBuilder._item('Sea depth', SightingDetailsBuilder.num(ext?.depth_m), 'm'),
                    SightingDetailsBuilder._item('Seabed slope', SightingDetailsBuilder.num(enr?.seabed_slope_deg, 1), '°'),
                    SightingDetailsBuilder._item('Distance to shelf edge', SightingDetailsBuilder.num(enr?.shelf_distance_km, 1), 'km')
                ]),
                SightingDetailsBuilder._group('Sea-surface temperature', ext?.weather_status ?? '', SightingDetailsBuilder.seconds(ext?.weather_last_update), [
                    {
                        label: 'Sea-surface temperature',
                        values: [SightingDetailsBuilder.num(ext?.sst_c_day, 1), SightingDetailsBuilder.num(ext?.sst_c_hour, 1)],
                        unit: '°C',
                        translate: false
                    }
                ], ['Day mean', 'At hour']),
                SightingDetailsBuilder._group('Ocean', ext?.ocean_status ?? '', SightingDetailsBuilder.seconds(ext?.ocean_last_update), [
                    SightingDetailsBuilder._item('Chlorophyll-a', SightingDetailsBuilder.num(ext?.chl_a_mg_m3_day, 3), 'mg/m³'),
                    SightingDetailsBuilder._item('Salinity', SightingDetailsBuilder.num(ext?.salinity_psu_day, 2), 'PSU'),
                    SightingDetailsBuilder._item('Sea level anomaly', SightingDetailsBuilder.num(ext?.sla_cm_day, 1), 'cm'),
                    SightingDetailsBuilder._item('Current speed', SightingDetailsBuilder.num(ext?.current_speed_m_s_day, 2), 'm/s'),
                    SightingDetailsBuilder._item('Current direction', SightingDetailsBuilder.num(ext?.current_direction_deg_day), '°'),
                    SightingDetailsBuilder._item('Regional mean current', SightingDetailsBuilder.num(ext?.current_region_mean_speed_m_s_day, 2), 'm/s'),
                    SightingDetailsBuilder._item('Regional max current', SightingDetailsBuilder.num(ext?.current_region_max_speed_m_s_day, 2), 'm/s'),
                    SightingDetailsBuilder._item('Current curl', sci(ext?.current_curl_s_inv_day), '1/s'),
                    SightingDetailsBuilder._item('Current divergence', sci(ext?.current_divergence_s_inv_day), '1/s'),
                    SightingDetailsBuilder._item('Coastal current component', SightingDetailsBuilder.num(ext?.current_coastal_component_m_s_day, 2), 'm/s')
                ]),
                SightingDetailsBuilder._group('Upwelling & fronts', enr?.derived_status ?? '', SightingDetailsBuilder.seconds(enr?.enrichment_last_update), [
                    SightingDetailsBuilder._item('Upwelling index', SightingDetailsBuilder.num(enr?.upwelling_index_day, 2), 'm³/s per 100 m'),
                    SightingDetailsBuilder._item('Temperature front', SightingDetailsBuilder.num(enr?.sst_front_grad_c_km_day, 3), '°C/km'),
                    SightingDetailsBuilder._item('Chlorophyll front', SightingDetailsBuilder.num(enr?.chl_front_grad_mg_m3_km_day, 4), 'mg/m³/km')
                ]),
                SightingDetailsBuilder._group('Biogeochemistry', enr?.bgc_status ?? '', SightingDetailsBuilder.seconds(enr?.enrichment_last_update), [
                    SightingDetailsBuilder._item('Oxygen', SightingDetailsBuilder.num(enr?.oxygen_mmol_m3_day, 1), 'mmol/m³'),
                    SightingDetailsBuilder._item('pH', SightingDetailsBuilder.num(enr?.ph_day, 2)),
                    SightingDetailsBuilder._item('Nitrate', SightingDetailsBuilder.num(enr?.nitrate_mmol_m3_day, 2), 'mmol/m³'),
                    SightingDetailsBuilder._item('Mixed layer depth', SightingDetailsBuilder.num(enr?.mld_m_day, 1), 'm'),
                    SightingDetailsBuilder._item('Net primary production', SightingDetailsBuilder.num(enr?.npp_mg_c_m2_day, 1), 'mg C/m²/day')
                ])
            ]
        };
    }

    protected static _astro(input: SightingDetailsInput): SightingDetailsSection {
        const enr = input.enrichment;
        const updated = SightingDetailsBuilder.seconds(enr?.enrichment_last_update);
        const phases: Record<string, string> = {flood: 'Flood', ebb: 'Ebb', high: 'High tide', low: 'Low tide'};
        const tide = enr?.tide_phase ?? '';

        return {
            key: 'astro',
            title: 'Astro & tide',
            groups: [
                SightingDetailsBuilder._group('Sun & moon', enr?.astro_status ?? '', updated, [
                    SightingDetailsBuilder._item('Moon phase', SightingDetailsBuilder.num(enr?.moon_phase, 2), '0 = new, 0.5 = full'),
                    SightingDetailsBuilder._item('Moon illumination', SightingDetailsBuilder.num(enr?.moon_illumination_pct), '%'),
                    SightingDetailsBuilder._item('Sun elevation', SightingDetailsBuilder.num(enr?.sun_elevation_deg, 1), '°'),
                    SightingDetailsBuilder._item('Sun azimuth', SightingDetailsBuilder.num(enr?.sun_azimuth_deg), '°'),
                    SightingDetailsBuilder._item('Day length', SightingDetailsBuilder.num(enr?.day_length_h, 1), 'h')
                ]),
                SightingDetailsBuilder._group('Tide', enr?.tide_status ?? '', updated, [
                    SightingDetailsBuilder._item('Tide height', SightingDetailsBuilder.num(enr?.tide_height_m, 2), 'm'),
                    SightingDetailsBuilder._item('Tide phase', phases[tide] ?? tide, '', tide in phases)
                ])
            ]
        };
    }

    protected static _human(input: SightingDetailsInput): SightingDetailsSection {
        const effort = input.effort;
        const enr = input.enrichment;
        const vessels = SightingDetailsBuilder._group(
            'Fishing vessels nearby',
            input.vessels.length > 0 ? 'ok' : effort?.fishing_status ?? '',
            SightingDetailsBuilder.seconds(input.vessels.reduce((max, v) => Math.max(max, Number(v.last_updated_at) || 0), 0)),
            [...input.vessels]
            .sort((a, b) => Number(b.hours) - Number(a.hours))
            .map((v) => ({
                label: v.name.trim() === '' ? v.mmsi || v.vessel_id : v.name,
                values: [v.mmsi, v.flag, v.gear_type, SightingDetailsBuilder.num(v.hours, 1)],
                unit: '',
                translate: false
            })),
            ['MMSI', 'Flag', 'Gear type', 'Fishing hours']
        );

        return {
            key: 'human',
            title: 'Fishing & human',
            groups: [
                SightingDetailsBuilder._group('Fishing effort', effort?.fishing_status ?? '', SightingDetailsBuilder.seconds(effort?.fishing_last_update), [
                    SightingDetailsBuilder._item('Fishing hours within 25 km', SightingDetailsBuilder.num(effort?.fishing_hours_day_25km, 1), 'h'),
                    SightingDetailsBuilder._item('Fishing hours within 50 km', SightingDetailsBuilder.num(effort?.fishing_hours_day_50km, 1), 'h'),
                    SightingDetailsBuilder._item('Fishing vessels within 25 km', SightingDetailsBuilder.num(effort?.vessel_count_day_25km)),
                    SightingDetailsBuilder._item('Main gear type', effort?.top_gear_type ?? ''),
                    SightingDetailsBuilder._item('Main flag', effort?.top_flag ?? '')
                ]),
                vessels,
                SightingDetailsBuilder._group('Human pressure', enr?.human_status ?? '', SightingDetailsBuilder.seconds(enr?.enrichment_last_update), [
                    SightingDetailsBuilder._item('Vessel traffic density', SightingDetailsBuilder.num(enr?.vessel_density_day, 2), 'h/km²/month'),
                    SightingDetailsBuilder._item('Distance to shipping lane', SightingDetailsBuilder.num(enr?.dist_shipping_lane_km, 1), 'km'),
                    SightingDetailsBuilder._item('Distance to port', SightingDetailsBuilder.num(enr?.dist_port_km, 1), 'km'),
                    SightingDetailsBuilder._item('Distance to protected area', SightingDetailsBuilder.num(enr?.dist_mpa_km, 1), 'km')
                ])
            ]
        };
    }

    protected static _movement(input: SightingDetailsInput): SightingDetailsSection {
        const m = input.movement;
        const knots = (mps: unknown): string => {
            const n = mps === null || mps === undefined ? NaN : Number(mps);
            return Number.isFinite(n) ? (n * 1.943844).toFixed(1) : '';
        };
        const sources: Record<string, string> = {
            tracking: 'Tracking points',
            manual_begin_end: 'Begin / end position',
            hybrid: 'Tracking + positions'
        };

        return {
            key: 'movement',
            title: 'Movement',
            groups: [
                SightingDetailsBuilder._group('Movement during the sighting', m ? 'ok' : '', SightingDetailsBuilder.seconds(m?.computed_at), m ? [
                    SightingDetailsBuilder._item('Based on', sources[m.source] ?? m.source, '', m.source in sources),
                    SightingDetailsBuilder._item('Segments', SightingDetailsBuilder.num(m.segment_count)),
                    SightingDetailsBuilder._item('Distance', SightingDetailsBuilder.num(m.total_distance_m), 'm'),
                    SightingDetailsBuilder._item('Duration', SightingDetailsBuilder.num(Number(m.total_duration_s) / 60, 1), 'min'),
                    SightingDetailsBuilder._item('Average speed', knots(m.avg_speed_mps), 'kn'),
                    SightingDetailsBuilder._item('Max speed', knots(m.max_speed_mps), 'kn'),
                    SightingDetailsBuilder._item('Main heading', SightingDetailsBuilder.num(m.dominant_heading_deg), '°'),
                    SightingDetailsBuilder._item('Heading variance', SightingDetailsBuilder.num(m.heading_variance_deg), '°'),
                    SightingDetailsBuilder._item('First point', SightingDetailsBuilder.num(m.first_dt), SightingDetailsBuilder.UNIX),
                    SightingDetailsBuilder._item('Last point', SightingDetailsBuilder.num(m.last_dt), SightingDetailsBuilder.UNIX)
                ] : [])
            ]
        };
    }

    protected static _seismic(input: SightingDetailsInput): SightingDetailsSection {
        const rows = [...input.seismic].sort((a, b) => Number(a.link.distance_km) - Number(b.link.distance_km));

        return {
            key: 'seismic',
            title: 'Earthquakes',
            groups: [
                SightingDetailsBuilder._group('Earthquakes nearby', rows.length > 0 ? 'ok' : '', 0, rows.map((row) => ({
                    label: row.quake?.place || `#${row.link.earthquake_id}`,
                    values: [
                        SightingDetailsBuilder.num(row.link.magnitude, 1),
                        SightingDetailsBuilder.num(row.link.distance_km, 1),
                        SightingDetailsBuilder.num(row.link.hours_offset, 1)
                    ],
                    unit: '',
                    translate: false
                })), ['Magnitude', 'Distance (km)', 'Time offset (h)'])
            ]
        };
    }

}