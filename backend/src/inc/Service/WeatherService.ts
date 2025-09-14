import {Job, scheduleJob} from 'node-schedule';
import {Sighting as SightingDB} from '../../Db/MariaDb/Entities/Sighting.js';
import {SightingExtended as SightingExtendedDB} from '../../Db/MariaDb/Entities/SightingExtended.js';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';

export class WeatherService {

    /**
     * instance
     * @private
     */
    private static _instance: WeatherService | null = null;

    /**
     * getInstance
     * @returns {WeatherService}
     */
    public static getInstance(): WeatherService {
        if (WeatherService._instance === null) {
            WeatherService._instance = new WeatherService();
        }

        return WeatherService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * update
     */
    public async update(): Promise<void> {
        const sightingExtendedRepository = MariaDbHelper.getConnection().getRepository(SightingExtendedDB);
        const bQry = sightingExtendedRepository.createQueryBuilder().select('sighting_id').where('name="depth_contour"');

        const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
        const tableNameSig = sightingRepository.metadata.name;

        const notIn = sightingRepository.createQueryBuilder().where(`${tableNameSig}.id NOT IN (${bQry.getSql()})`).limit(5);
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        this._scheduler = scheduleJob('*/1 * * * *', async() => {
            await this.update();
        });
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (this._scheduler !== null) {
            this._scheduler.cancel();
        }
    }

}