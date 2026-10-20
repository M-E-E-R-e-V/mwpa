import {Enricher, EnricherResult, EnrichmentContext} from '../Types.js';

/**
 * Astronomy enricher — moon phase/illumination, solar elevation/azimuth and
 * day length. Pure computation from the sighting date, position and (for the
 * solar instant) local clock time; no external data source.
 *
 * Solar geometry uses the NOAA solar-position algorithm. Because sighting
 * records carry a local wall-clock time with no reliable timezone, the clock
 * is interpreted as mean solar time at the sighting longitude (tz = lon/15).
 * In the NOAA pipeline the longitude term and that timezone term cancel, so
 * the result is the true-solar-time geometry at the point — the physically
 * meaningful quantity for a glare/detectability covariate — independent of
 * the civil timezone the observer happened to be in. Values are therefore
 * approximate when the recorded time is itself off.
 */
export class AstronomyEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'astro';

    /**
     * Mean synodic month (new moon → new moon), days.
     * @private
     */
    private static readonly SYNODIC_MONTH_DAYS = 29.530588853;

    /**
     * Julian date of a reference new moon (2000-01-06 18:14 UTC).
     * @private
     */
    private static readonly NEW_MOON_EPOCH_JD = 2451550.1;

    public getName(): string {
        return AstronomyEnricher.NAME;
    }

    public async enrich(ctx: EnrichmentContext): Promise<EnricherResult> {
        const parts = AstronomyEnricher._parseDate(ctx.isoDate);

        if (parts === null) {
            return {
                fields: {astro_status: 'invalid_date'},
                provenance: {}
            };
        }

        const {year, month, day} = parts;
        const jd0 = AstronomyEnricher._julianDayUt0(year, month, day);

        // Moon phase at local midday — date-level, timezone-insensitive.
        const phase = AstronomyEnricher._moonPhaseFraction(jd0 + 0.5);
        const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2 * 100;

        // Day length from the solar declination at local solar noon.
        const tzHours = ctx.longitude / 15;
        const declNoon = AstronomyEnricher._solarDeclinationDeg(jd0 + ((12 - tzHours) / 24));
        const dayLength = AstronomyEnricher._dayLengthH(ctx.latitude, declNoon);

        const fields: EnricherResult['fields'] = {
            moon_phase: AstronomyEnricher._round(phase, 3),
            moon_illumination_pct: AstronomyEnricher._round(illumination, 1),
            day_length_h: AstronomyEnricher._round(dayLength, 2),
            astro_status: 'ok'
        };

        const provenance: Record<string, string> = {
            moon_phase: AstronomyEnricher.NAME,
            moon_illumination_pct: AstronomyEnricher.NAME,
            day_length_h: AstronomyEnricher.NAME
        };

        // Solar elevation/azimuth need the instant — only with a clock time.
        const time = AstronomyEnricher._parseTime(ctx.timeHHmm);

        if (time !== null) {
            const sun = AstronomyEnricher._sunPosition(
                jd0,
                time.hours,
                time.minutes,
                tzHours,
                ctx.latitude
            );

            fields.sun_elevation_deg = AstronomyEnricher._round(sun.elevationDeg, 1);
            fields.sun_azimuth_deg = Math.round(sun.azimuthDeg);
            provenance.sun_elevation_deg = AstronomyEnricher.NAME;
            provenance.sun_azimuth_deg = AstronomyEnricher.NAME;
        }

        return {
            fields: fields,
            provenance: provenance
        };
    }

    /**
     * Parse 'YYYY-MM-DD' → numeric parts, or null.
     * @private
     */
    private static _parseDate(isoDate: string): {year: number; month: number; day: number;} | null {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(isoDate);

        if (match === null) {
            return null;
        }

        return {
            year: Number(match[1]),
            month: Number(match[2]),
            day: Number(match[3])
        };
    }

    /**
     * Parse 'HH:mm' (tolerating a trailing ':ss') → hours/minutes, or null.
     * @private
     */
    private static _parseTime(raw: string | null): {hours: number; minutes: number;} | null {
        if (raw === null) {
            return null;
        }

        const match = /^(\d{1,2}):(\d{2})/u.exec(raw.trim());

        if (match === null) {
            return null;
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }

        return {hours: hours, minutes: minutes};
    }

    /**
     * Julian Day at 0h UT of the given calendar date (Gregorian).
     * @private
     */
    private static _julianDayUt0(year: number, month: number, day: number): number {
        let y = year;
        let m = month;

        if (m <= 2) {
            y -= 1;
            m += 12;
        }

        const a = Math.floor(y / 100);
        const b = 2 - a + Math.floor(a / 4);

        return Math.floor(365.25 * (y + 4716))
            + Math.floor(30.6001 * (m + 1))
            + day + b - 1524.5;
    }

    /**
     * Moon phase as a fraction of the synodic cycle (0 = new, 0.5 = full).
     * @private
     */
    private static _moonPhaseFraction(jd: number): number {
        const age = (jd - AstronomyEnricher.NEW_MOON_EPOCH_JD) % AstronomyEnricher.SYNODIC_MONTH_DAYS;
        const positive = age < 0 ? age + AstronomyEnricher.SYNODIC_MONTH_DAYS : age;

        return positive / AstronomyEnricher.SYNODIC_MONTH_DAYS;
    }

    /**
     * Degrees → radians.
     * @private
     */
    private static _rad(deg: number): number {
        return deg * Math.PI / 180;
    }

    /**
     * Radians → degrees.
     * @private
     */
    private static _deg(rad: number): number {
        return rad * 180 / Math.PI;
    }

    /**
     * Solar declination (degrees) for a given Julian Day, via the NOAA
     * apparent-longitude pipeline.
     * @private
     */
    private static _solarDeclinationDeg(jd: number): number {
        const t = (jd - 2451545.0) / 36525.0;
        const l0 = AstronomyEnricher._norm360(280.46646 + (t * (36000.76983 + (t * 0.0003032))));
        const m = 357.52911 + (t * (35999.05029 - (0.0001537 * t)));
        const mRad = AstronomyEnricher._rad(m);
        const c = (Math.sin(mRad) * (1.914602 - (t * (0.004817 + (0.000014 * t)))))
            + (Math.sin(2 * mRad) * (0.019993 - (0.000101 * t)))
            + (Math.sin(3 * mRad) * 0.000289);
        const trueLong = l0 + c;
        const omega = 125.04 - (1934.136 * t);
        const lambda = (trueLong - 0.00569) - (0.00478 * Math.sin(AstronomyEnricher._rad(omega)));
        const epsilon0 = 23 + ((26 + (((21.448 - (t * (46.815 + (t * (0.00059 - (t * 0.001813)))))) / 60))) / 60);
        const epsilon = epsilon0 + (0.00256 * Math.cos(AstronomyEnricher._rad(omega)));
        const decl = Math.asin(Math.sin(AstronomyEnricher._rad(epsilon)) * Math.sin(AstronomyEnricher._rad(lambda)));

        return AstronomyEnricher._deg(decl);
    }

    /**
     * Hours of daylight for a latitude and solar declination (degrees).
     * Returns 24 inside the polar day and 0 inside the polar night.
     * @private
     */
    private static _dayLengthH(latDeg: number, declDeg: number): number {
        const cosH = -Math.tan(AstronomyEnricher._rad(latDeg)) * Math.tan(AstronomyEnricher._rad(declDeg));

        if (cosH <= -1) {
            return 24;
        }

        if (cosH >= 1) {
            return 0;
        }

        const hDeg = AstronomyEnricher._deg(Math.acos(cosH));

        return 2 * hDeg / 15;
    }

    /**
     * Solar elevation + azimuth (degrees) at a local clock time, via NOAA.
     * tz = lon/15, so the longitude and timezone terms cancel and the
     * geometry is the true-solar-time position at the point.
     * @private
     */
    private static _sunPosition(
        jd0: number,
        hours: number,
        minutes: number,
        tzHours: number,
        latDeg: number
    ): {elevationDeg: number; azimuthDeg: number;} {
        const localMinutes = (hours * 60) + minutes;
        const timeUtHours = (localMinutes / 60) - tzHours;
        const jd = jd0 + (timeUtHours / 24);
        const t = (jd - 2451545.0) / 36525.0;

        const l0 = AstronomyEnricher._norm360(280.46646 + (t * (36000.76983 + (t * 0.0003032))));
        const m = 357.52911 + (t * (35999.05029 - (0.0001537 * t)));
        const mRad = AstronomyEnricher._rad(m);
        const e = 0.016708634 - (t * (0.000042037 + (0.0000001267 * t)));
        const c = (Math.sin(mRad) * (1.914602 - (t * (0.004817 + (0.000014 * t)))))
            + (Math.sin(2 * mRad) * (0.019993 - (0.000101 * t)))
            + (Math.sin(3 * mRad) * 0.000289);
        const trueLong = l0 + c;
        const omega = 125.04 - (1934.136 * t);
        const lambda = (trueLong - 0.00569) - (0.00478 * Math.sin(AstronomyEnricher._rad(omega)));
        const epsilon0 = 23 + ((26 + (((21.448 - (t * (46.815 + (t * (0.00059 - (t * 0.001813)))))) / 60))) / 60);
        const epsilon = epsilon0 + (0.00256 * Math.cos(AstronomyEnricher._rad(omega)));
        const epsRad = AstronomyEnricher._rad(epsilon);
        const lambdaRad = AstronomyEnricher._rad(lambda);
        const declRad = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad));

        // Equation of time (minutes).
        const y = Math.tan(epsRad / 2) ** 2;
        const l0Rad = AstronomyEnricher._rad(l0);
        const eqTime = 4 * AstronomyEnricher._deg(
            (y * Math.sin(2 * l0Rad))
            - (2 * e * Math.sin(mRad))
            + (4 * e * y * Math.sin(mRad) * Math.cos(2 * l0Rad))
            - (0.5 * y * y * Math.sin(4 * l0Rad))
            - (1.25 * e * e * Math.sin(2 * mRad))
        );

        // True solar time (minutes); lon/tz cancel with tz = lon/15.
        const trueSolarTime = AstronomyEnricher._normRange(localMinutes + eqTime, 1440);
        const hourAngle = (trueSolarTime / 4) < 0 ? (trueSolarTime / 4) + 180 : (trueSolarTime / 4) - 180;
        const haRad = AstronomyEnricher._rad(hourAngle);
        const latRad = AstronomyEnricher._rad(latDeg);

        const cosZenith = (Math.sin(latRad) * Math.sin(declRad))
            + (Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad));
        const zenithRad = Math.acos(Math.min(1, Math.max(-1, cosZenith)));
        const elevationDeg = 90 - AstronomyEnricher._deg(zenithRad);

        // Azimuth (degrees clockwise from true north).
        const denom = Math.cos(latRad) * Math.sin(zenithRad);
        let azimuthDeg = 0;

        if (Math.abs(denom) > 1e-9) {
            const cosAz = ((Math.sin(latRad) * Math.cos(zenithRad)) - Math.sin(declRad)) / denom;
            const azAcos = AstronomyEnricher._deg(Math.acos(Math.min(1, Math.max(-1, cosAz))));
            azimuthDeg = hourAngle > 0
                ? AstronomyEnricher._normRange(azAcos + 180, 360)
                : AstronomyEnricher._normRange(540 - azAcos, 360);
        }

        return {elevationDeg: elevationDeg, azimuthDeg: azimuthDeg};
    }

    /**
     * Normalise to [0, 360).
     * @private
     */
    private static _norm360(deg: number): number {
        return AstronomyEnricher._normRange(deg, 360);
    }

    /**
     * Normalise to [0, range).
     * @private
     */
    private static _normRange(value: number, range: number): number {
        const mod = value % range;

        return mod < 0 ? mod + range : mod;
    }

    /**
     * Round to `digits` decimals.
     * @private
     */
    private static _round(value: number, digits: number): number {
        const factor = 10 ** digits;

        return Math.round(value * factor) / factor;
    }

}