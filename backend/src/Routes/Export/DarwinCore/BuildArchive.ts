import JSZip from 'jszip';
import {SightingExtendedRepository} from '../../../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * Options for {@link DarwinCoreArchive.build}.
 */
export type DarwinCoreArchiveOptions = {

    /**
     * Organisation ids to scope the export to (non-admin). `undefined` =
     * no scoping (admin / full dataset) — the usual case for an OBIS export.
     */
    organizationIds?: number[];

    /**
     * ISO timestamp (UTC) stamped into the EML metadata. Passed in so the
     * builder stays deterministic / side-effect free.
     */
    nowIso: string;

};

/**
 * Builds a Darwin Core Archive (DwC-A) for the sightings — the ZIP format
 * OBIS / GBIF ingest: an Occurrence core (`occurrence.txt`, tab-delimited)
 * plus `meta.xml` (maps columns to DwC term URIs) and a minimal GBIF-profile
 * `eml.xml` (dataset metadata, incl. the samplingProtocol that documents the
 * Path-A coordinate-uncertainty assumption).
 *
 * One row per non-deleted sighting that has a parseable position and a known
 * species (an Occurrence must carry a scientificName). The raw `sighting`
 * table is only read.
 */
export class DarwinCoreArchive {

    /**
     * Occurrence core columns, in file order. The first column is the record
     * id (occurrenceID). Each maps to a Darwin Core term in {@link _TERMS}.
     * @private
     */
    private static readonly _COLUMNS = [
        'occurrenceID',
        'basisOfRecord',
        'eventDate',
        'decimalLatitude',
        'decimalLongitude',
        'geodeticDatum',
        'coordinateUncertaintyInMeters',
        'scientificName',
        'scientificNameID',
        'kingdom',
        'occurrenceStatus',
        'individualCount',
        'eventID',
        'samplingProtocol'
    ];

    /**
     * Darwin Core term URI per column (same order as {@link _COLUMNS}).
     * @private
     */
    private static readonly _TERMS = DarwinCoreArchive._COLUMNS.map(
        (c) => `http://rs.tdwg.org/dwc/terms/${c}`
    );

    /**
     * Fixed samplingProtocol note (also mirrored in the EML methods).
     * @private
     */
    private static readonly _SAMPLING_PROTOCOL =
        'Boat-based platform of opportunity. coordinateUncertaintyInMeters is a '
        + 'per-species-class default plus the GPS accuracy of the fix (Path A), '
        + 'not a measured distance.';

    /**
     * Build the archive as a ZIP buffer.
     */
    public static async build(options: DarwinCoreArchiveOptions): Promise<Buffer> {
        const {rows} = await SightingRepository.getInstance().findActiveList(
            {date: 'ASC', tour_start: 'ASC'},
            undefined,
            undefined,
            options.organizationIds,
            {}
        );

        const species = await SpeciesRepository.getInstance().findAllWithGroup();
        const speciesById = new Map<number, {name: string; aphiaId: number;}>();

        for (const entry of species) {
            speciesById.set(entry.id, {name: entry.name, aphiaId: entry.aphia_id});
        }

        const extended = await SightingExtendedRepository.getInstance().findManyBySightings(
            rows.map((r) => r.id)
        );
        const uncertaintyById = new Map<number, number | null>();

        for (const ext of extended) {
            uncertaintyById.set(ext.sighting_id, DarwinCoreArchive._num(ext.coordinate_uncertainty_m));
        }

        const lines: string[] = [DarwinCoreArchive._COLUMNS.join('\t')];

        for (const sighting of rows) {
            if (sighting.unid === '' || sighting.species_id <= 0) {
                continue;
            }

            const pos = DarwinCoreArchive._parseLocation(sighting.location_begin);
            const sp = speciesById.get(sighting.species_id);

            if (pos === null || sp === undefined) {
                continue;
            }

            lines.push(DarwinCoreArchive._row(sighting, pos, sp, uncertaintyById.get(sighting.id) ?? null));
        }

        const zip = new JSZip();
        zip.file('occurrence.txt', `${lines.join('\n')}\n`);
        zip.file('meta.xml', DarwinCoreArchive._metaXml());
        zip.file('eml.xml', DarwinCoreArchive._emlXml(options.nowIso, lines.length - 1));

        return zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'});
    }

    /**
     * Build one tab-delimited occurrence row.
     * @private
     */
    private static _row(
        sighting: {unid: string; date: string; species_count: number; tour_fid: string;},
        pos: {latitude: number; longitude: number;},
        species: {name: string; aphiaId: number;},
        uncertaintyM: number | null
    ): string {
        const values = [
            sighting.unid,
            'HumanObservation',
            DarwinCoreArchive._eventDate(sighting.date),
            `${DarwinCoreArchive._round(pos.latitude, 6)}`,
            `${DarwinCoreArchive._round(pos.longitude, 6)}`,
            'WGS84',
            uncertaintyM === null ? '' : `${uncertaintyM}`,
            species.name,
            species.aphiaId > 0 ? `urn:lsid:marinespecies.org:taxname:${species.aphiaId}` : '',
            'Animalia',
            'present',
            sighting.species_count > 0 ? `${sighting.species_count}` : '',
            sighting.tour_fid,
            DarwinCoreArchive._SAMPLING_PROTOCOL
        ];

        return values.map((v) => DarwinCoreArchive._escape(v)).join('\t');
    }

    /**
     * Darwin Core `eventDate` from the stored date — keep the ISO date part
     * only (time has no reliable timezone), empty if unparseable.
     * @private
     */
    private static _eventDate(raw: string): string {
        const dateOnly = raw.split(' ')[0].split('T')[0];

        return (/^\d{4}-\d{2}-\d{2}$/u).test(dateOnly) ? dateOnly : '';
    }

    /**
     * Strip delimiters from a field value so the tab-delimited core stays
     * well-formed (DwC-A has no quoting here).
     * @private
     */
    private static _escape(value: string): string {
        return value.replace(/[\t\r\n]+/gu, ' ').trim();
    }

    /**
     * Parse latitude/longitude from location_begin JSON.
     * @private
     */
    private static _parseLocation(raw: string): {latitude: number; longitude: number;} | null {
        try {
            const data = JSON.parse(raw) as {latitude?: number; longitude?: number;};
            const lat = data.latitude;
            const lon = data.longitude;

            if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
                return {latitude: lat, longitude: lon};
            }
        } catch {
            // ignore — return null
        }

        return null;
    }

    /**
     * Coerce a TypeORM decimal/int (possibly string) to a finite number, else
     * null.
     * @private
     */
    private static _num(value: number | string | null): number | null {
        if (value === null) {
            return null;
        }

        const n = typeof value === 'number' ? value : Number(value);

        return Number.isFinite(n) ? n : null;
    }

    /**
     * Round to `digits` decimals.
     * @private
     */
    private static _round(value: number, digits: number): number {
        const factor = 10 ** digits;

        return Math.round(value * factor) / factor;
    }

    /**
     * The archive descriptor mapping the core file's columns to DwC terms.
     * @private
     */
    private static _metaXml(): string {
        const fields = DarwinCoreArchive._TERMS.map(
            (term, i) => `    <field index="${i}" term="${term}"/>`
        ).join('\n');

        return '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<archive xmlns="http://rs.tdwg.org/dwc/text/">\n'
            + '  <core encoding="UTF-8" fieldsTerminatedBy="\\t" linesTerminatedBy="\\n" '
            + 'fieldsEnclosedBy="" ignoreHeaderLines="1" '
            + 'rowType="http://rs.tdwg.org/dwc/terms/Occurrence">\n'
            + '    <files>\n'
            + '      <location>occurrence.txt</location>\n'
            + '    </files>\n'
            + '    <id index="0"/>\n'
            + `${fields}\n`
            + '  </core>\n'
            + '</archive>\n';
    }

    /**
     * Minimal GBIF-profile EML dataset metadata.
     * @private
     */
    private static _emlXml(nowIso: string, recordCount: number): string {
        const pubDate = nowIso.slice(0, 10);

        return '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<eml:eml xmlns:eml="eml://ecoinformatics.org/eml-2.1.1" '
            + 'xmlns:dc="http://purl.org/dc/terms/" '
            + `packageId="mwpa-occurrence-${pubDate}" system="mwpa" scope="system" xml:lang="en">\n`
            + '  <dataset>\n'
            + '    <title>MWPA cetacean &amp; sea-turtle sightings</title>\n'
            + '    <creator>\n'
            + '      <organizationName>MWPA</organizationName>\n'
            + '    </creator>\n'
            + '    <contact>\n'
            + '      <organizationName>MWPA</organizationName>\n'
            + '    </contact>\n'
            + `    <pubDate>${pubDate}</pubDate>\n`
            + '    <language>en</language>\n'
            + `    <abstract><para>Boat-based opportunistic sightings of marine megafauna (${recordCount} `
            + 'occurrence records). Positions are in-situ GPS fixes; '
            + 'coordinateUncertaintyInMeters is a Path-A estimate (per-species-class '
            + 'default plus GPS accuracy).</para></abstract>\n'
            + '    <intellectualRights><para>Rights held by MWPA; contact before reuse.</para></intellectualRights>\n'
            + '    <methods>\n'
            + `      <methodStep><description><para>${DarwinCoreArchive._SAMPLING_PROTOCOL}</para></description></methodStep>\n`
            + '    </methods>\n'
            + '  </dataset>\n'
            + '</eml:eml>\n';
    }

}