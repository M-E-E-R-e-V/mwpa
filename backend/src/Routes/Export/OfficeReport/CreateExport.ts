import fs from 'fs';
import moment from 'moment';
import xlsx, {WorkSheet} from 'node-xlsx';
import Path from 'path';
import {Logger} from 'figtree';
import {OfficeReportFilter} from 'mwpa_schemas';
import {BehaviouralStates as BehaviouralStatesDB} from '../../../Db/MariaDb/Entities/BehaviouralStates.js';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesExternLinkRepository} from '../../../Db/MariaDb/Repositories/SpeciesExternLinkRepository.js';
import {UtilPosition, UtilPositionToStr} from '../../../Utils/UtilPosition.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';

const TEMPLATE_FILENAME = 'AVISTAMIENTOS_EIDOS_PLANTILLA_AROC.XLSM';
const SHEET_NAME = 'DatosCetáceos';
const FIRST_DATA_ROW = 2;

/**
 * Map a behavioural-state name to the Spanish AROC label expected by the template.
 * Returns '' for unknown names so the cell stays empty.
 */
function mapBehaviour(name: string): string {
    switch (name) {
        case 'RESTING': return 'Descanso';
        case 'TRAVELLING':
        case 'FAST TRAVEL':
        case 'SLOW TRAVEL': return 'Migración';
        case 'DIVE': return 'Otros';
        case 'SOCIAL': return 'Reproducción';
        case 'FORAGE/FEEDING': return 'Alimentación';
        case 'MILLING': return 'En desplazamiento';
        case 'MIXED':
        default: return '';
    }
}

/**
 * Resolve the first behaviour name from a sighting's stored JSON `behaviours` blob.
 * The blob is `{[anyKey]: behaviourIdAsString}`; we take the first one that matches a known state.
 */
function firstBehaviourLabel(json: string, behStates: Map<number, BehaviouralStatesDB>): string {
    try {
        const data = JSON.parse(json);
        if (!data) return '';
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const beh = behStates.get(parseInt(value, 10));
                if (beh) {
                    return mapBehaviour(beh.name);
                }
            }
        }
    } catch {
        // ignore
    }
    return '';
}

/**
 * CreateExport
 */
export class CreateExport {

    /**
     * Build an AROC office-report XLSX by filling the on-disk template with all non-deleted
     * sightings that have a known species. Returns null when the template or data dir is
     * missing — the route layer turns that into a 404/500.
     * @param {OfficeReportFilter | undefined} filter
     * @return {Buffer | null}
     */
    public static async createExport(filter?: OfficeReportFilter): Promise<Buffer | null> {
        Logger.getLogger().info('OfficeReport::createExport: start!');

        const reportDir = await UtilUploadPath.getOfficeReportDirectory();
        if (reportDir === null) {
            Logger.getLogger().error('OfficeReport::createExport: assets dir can not create/found!');
            return null;
        }

        const templatePath = Path.join(reportDir, TEMPLATE_FILENAME);
        if (!fs.existsSync(templatePath)) {
            Logger.getLogger().error(`OfficeReport::createExport: template missing: ${templatePath}`);
            return null;
        }

        // BUG-FIX vs old-backend: original hardcoded external_receiver_id = 1 and ignored the filter.
        // Honour the filter here; default to 1 to preserve behaviour for callers that don't pass one.
        const externalReceiverId = filter?.external_receiver_id && filter.external_receiver_id > 0
            ? filter.external_receiver_id
            : 1;

        // Load all behavioural states once for in-memory lookup.
        const behStates = new Map<number, BehaviouralStatesDB>();
        for (const beh of await BehaviouralStatesRepository.getInstance().findAll()) {
            behStates.set(beh.id, beh);
        }

        const repository = await SightingRepository.getInstance().getRepository();
        const sightings = await repository.find({
            where: {deleted: false},
            order: {date: 'DESC', tour_start: 'DESC'}
        });

        const workSheets = xlsx.parse(templatePath, {
            bookVBA: true,
            cellDates: true
        });

        if (!workSheets || workSheets.length < 2 || workSheets[1].name !== SHEET_NAME) {
            Logger.getLogger().error(`OfficeReport::createExport: sheet "${SHEET_NAME}" not found at index 1`);
            return null;
        }

        const data = workSheets[1].data as unknown[][];
        let index = FIRST_DATA_ROW;

        for (const entry of sightings) {
            if (entry.species_id === 0) {
                continue;
            }

            const date = moment(entry.date);

            const speciesExternLink = await SpeciesExternLinkRepository.getInstance().findByReceiverAndSpecies(
                externalReceiverId,
                entry.species_id
            );

            let nombreCientifico = 'not found';
            if (speciesExternLink) {
                nombreCientifico = speciesExternLink.externname;
            } else {
                Logger.getLogger().info(`OfficeReport::createExport: extern link not found by species ID: ${entry.species_id}`);
            }

            // NOTE: legacy lat/lon swap is preserved on purpose — see UtilPosition enum doc.
            const positionBeginLat = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LatDec);
            const positionBeginLon = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LonDec);

            let presenciaDeCriasStr = '';
            if (entry.calves > 0 || entry.newborns > 0) {
                presenciaDeCriasStr = 'si';
            } else if (entry.calves === 0 && entry.newborns === 0) {
                presenciaDeCriasStr = 'no';
            }

            const behaviourStr = firstBehaviourLabel(entry.behaviours, behStates);

            data[index] = [
                date.format('DD/MM/YYYY'),
                entry.tour_start,
                entry.tour_end,
                entry.duration_from,
                '', // TaxonID
                nombreCientifico,
                '',
                'OCEANO Whale Watching La Gomera/M.E.E.R. e.V.',
                '',
                '',
                '',
                '',
                '',
                '',
                'Coordenadas Geográficas WGS84',
                positionBeginLon,
                positionBeginLat,
                '',
                '',
                entry.species_count === 0 ? '' : `${entry.species_count}`,
                presenciaDeCriasStr,
                behaviourStr,
                'Avistamiento AROC'
            ];

            index++;
        }

        workSheets[1].data = data;

        try {
            return xlsx.build(workSheets as WorkSheet<unknown>[]);
        } catch (e) {
            Logger.getLogger().error('OfficeReport::createExport: xlsx.build failed', e as Error);
            return null;
        }
    }

}