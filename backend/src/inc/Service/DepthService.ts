import {Job, scheduleJob} from 'node-schedule';
import {Sighting as SightingDB} from '../Db/MariaDb/Entity/Sighting';
import {SightingExtended as SightingExtendedDB} from '../Db/MariaDb/Entity/SightingExtended';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Navionics} from '../Provider/Navionics/Navionics';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';

export class DepthService {

    /**
     * instance
     * @private
     */
    private static _instance: DepthService | null = null;

    /**
     * getInstance
     */
    public static getInstance(): DepthService {
        if (DepthService._instance === null) {
            DepthService._instance = new DepthService();
        }

        return DepthService._instance;
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
        const navionics = new Navionics();
        const sightingExtendedRepository = MariaDbHelper.getConnection().getRepository(SightingExtendedDB);

        const bQry = sightingExtendedRepository.createQueryBuilder().select('sighting_id').where('name="depth_contour"');

        const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
        const tableNameSig = sightingRepository.metadata.name;

        const notIn = sightingRepository.createQueryBuilder().where(`${tableNameSig}.id NOT IN (${bQry.getSql()})`).limit(5);
        const list = await notIn.getMany();

        for (const sighting of list) {
            if (sighting.location_begin) {
                try {
                    const data = JSON.parse(sighting.location_begin) as GeolocationCoordinates;

                    if (data.latitude && data.longitude) {
                        const depth = await navionics.getWaterDepth(data.latitude, data.longitude);

                        if (depth) {
                            const sec = new SightingExtendedDB();
                            sec.sighting_id = sighting.id;
                            sec.name = 'depth_contour';

                            if (depth.depth_contour) {
                                sec.data = `${depth.depth_contour}`;
                            }

                            await MariaDbHelper.getConnection().manager.save(sec);

                            const sea = new SightingExtendedDB();
                            sea.sighting_id = sighting.id;
                            sea.name = 'depth_area';

                            if (depth.depth_area) {
                                sea.data = `${JSON.stringify(depth.depth_area)}`;
                            }

                            await MariaDbHelper.getConnection().manager.save(sea);
                        }

                        console.log(depth);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }
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