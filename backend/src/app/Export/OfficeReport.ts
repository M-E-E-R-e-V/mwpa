import fs from 'fs';
import xlsx, {WorkSheet} from 'node-xlsx';
import Path from 'path';
import moment from 'moment';
import {Body, ContentType, Get, JsonController, Session} from 'routing-controllers';
import {Config} from '../../inc/Config/Config';
import {BehaviouralStates as BehaviouralStatesDB} from '../../inc/Db/MariaDb/Entity/BehaviouralStates';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SpeciesExternLink as SpeciesExternLinkDB} from '../../inc/Db/MariaDb/Entity/SpeciesExternLink';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Logger} from '../../inc/Logger/Logger';
import {UtilPosition, UtilPositionToStr} from '../../inc/Utils/UtilPosition';

/**
 * OfficeReportFilter
 */
export type OfficeReportFilter = {
    external_receiver_id: number;
};

/**
 * OfficeReport
 */
@JsonController()
export class OfficeReport {

    /**
     * _getAssetsDir
     * @protected
     */
    protected _getAssetsDir(): string|null {
        const config = Config.get();

        if (config?.datadir !== null && fs.existsSync(config?.datadir!)) {
            let reportDir = Path.join(config?.datadir!, 'office_report');

            if (reportDir.charAt(0) !== '/') {
                reportDir = Path.join(Path.resolve(), reportDir);
            }

            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, {
                    recursive: true,
                    mode: 0o744
                });
            }

            return reportDir;
        }

        return null;
    }

    @Get('/json/officereport/create_export')
    @ContentType('application/octet-stream')
    public async createExport(@Body() filter: OfficeReportFilter, @Session() session: any): Promise<Buffer | null> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isAdmin) {
            Logger.log('OfficeReport::createExport: start!');

            const reportDir = this._getAssetsDir();

            if (reportDir === null) {
                Logger.log('OfficeReport::createExport: assets dir can not create/found!');
                return null;
            }

            // repositories --------------------------------------------------------------------------------------------

            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
            const speciesExternLinkRepository = MariaDbHelper.getConnection().getRepository(SpeciesExternLinkDB);
            const behStatesRepository = MariaDbHelper.getConnection().getRepository(BehaviouralStatesDB);

            // behavioural states --------------------------------------------------------------------------------------

            const behStates: Map<number, BehaviouralStatesDB> = new Map<number, BehaviouralStatesDB>();

            const dbBehStates = await behStatesRepository.find();

            if (dbBehStates) {
                for (const dbBehState of dbBehStates) {
                    behStates.set(dbBehState.id, dbBehState);
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            const dblist = await sightingRepository.find({
                where: {
                    deleted: false
                },
                order: {
                    date: 'DESC',
                    tour_start: 'DESC'
                }
            });

            const workSheets = xlsx.parse(Path.join(reportDir, 'AVISTAMIENTOS_EIDOS_PLANTILLA_AROC.XLSM'), {
                bookVBA: true,
                cellDates: true
            });

            if (!workSheets) {
                return null;
            }

            if (workSheets[1].name === 'DatosCetáceos') {
                const data = workSheets[1].data;

                let index = 2;

                for (const entry of dblist) {
                    if (entry.species_id === 0) {
                        continue;
                    }

                    // date --------------------------------------------------------------------------------------------

                    const date = moment(entry.date);

                    // external species --------------------------------------------------------------------------------

                    const speciesExternLink = await speciesExternLinkRepository.findOne({
                        where: {
                            external_receiver_id: 1,
                            species_id: entry.species_id
                        }
                    });

                    let nombreCientifico = 'not found';

                    if (speciesExternLink) {
                        nombreCientifico = speciesExternLink.externname;
                    } else {
                        Logger.log(`OfficeReport::createExport: extern link not found by species ID: ${entry.species_id}`);
                    }

                    const positionBeginLat = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LatDec);
                    const positionBeginLon = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LonDec);


                    let presenciaDeCriasStr = '';

                    if (entry.calves > 0 || entry.newborns > 0) {
                        presenciaDeCriasStr = 'si';
                    }

                    if (entry.calves === 0 && entry.newborns === 0) {
                        presenciaDeCriasStr = 'no';
                    }

                    // behaviour ---------------------------------------------------------------------------------------
                    let behaviourStr = '';

                    try {
                        const behaviourData = JSON.parse(entry.behaviours);

                        if (behaviourData) {
                            Object.entries(behaviourData).forEach(([, value]) => {
                                if (typeof value === 'string') {
                                    const behaviour = behStates.get(parseInt(value, 10));

                                    if (behaviour) {
                                        switch (behaviour.name) {
                                            case 'RESTING':
                                                behaviourStr = 'Descanso';
                                                break;

                                            case 'TRAVELLING':
                                            case 'FAST TRAVEL':
                                            case 'SLOW TRAVEL':
                                                behaviourStr = 'Migración';
                                                break;

                                            case 'DIVE':
                                                behaviourStr = 'Otros';
                                                break;

                                            case 'SOCIAL':
                                                behaviourStr = 'Reproducción';
                                                break;

                                            case 'FORAGE/FEEDING':
                                                behaviourStr = 'Alimentación';
                                                break;

                                            case 'MILLING':
                                                behaviourStr = 'En desplazamiento';
                                                break;

                                            case 'MIXED':
                                                behaviourStr = '';
                                                break;
                                        }

                                        return true;
                                    }
                                }

                                return false;
                            });
                        }
                    } catch (e) {
                        behaviourStr = '';
                    }

                    // -------------------------------------------------------------------------------------------------

                    data[index] = [
                        `${date.format('DD/MM/YYYY')}`,
                        `${entry.tour_start}`,
                        `${entry.tour_end}`,
                        `${entry.duration_from}`,
                        '', // TaxonID
                        `${nombreCientifico}`,
                        '',
                        'OCEANO Whale Watching La Gomera/M.E.E.R. e.V.',
                        '',
                        '',
                        '',
                        '',
                        '',
                        '',
                        'Coordenadas Geográficas WGS84',
                        `${positionBeginLon}`,
                        `${positionBeginLat}`,
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

                const buffer = xlsx.build(workSheets as WorkSheet<unknown>[]);

                try {
                    return buffer;
                } catch (e) {
                    console.log(e);
                }
            }
        }

        return null;
    }

}