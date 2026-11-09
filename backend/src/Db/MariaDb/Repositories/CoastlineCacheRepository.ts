import {DBRepository} from '@stefanwerfling/figtree';
import {CoastlineCache} from '../Entities/CoastlineCache.js';

/**
 * CoastlineCache repository
 */
export class CoastlineCacheRepository extends DBRepository<CoastlineCache> {

    public static REGISTER_NAME = 'coastline_cache';

    public static getInstance(): CoastlineCacheRepository {
        return super.getSingleInstance(CoastlineCache);
    }

    /**
     * Row of an area or null.
     */
    public async findByKey(areaKey: string): Promise<CoastlineCache | null> {
        const repository = await this._repository;

        return repository.findOne({
            where: {
                area_key: areaKey
            }
        });
    }

    /**
     * Areas with loaded lines whose box contains the point, smallest box first.
     */
    public async findContaining(lat: number, lon: number): Promise<CoastlineCache[]> {
        const repository = await this._repository;

        return repository.createQueryBuilder('c')
        .where('c.lines IS NOT NULL')
        .andWhere('c.fetch_datetime > 0')
        .andWhere('c.south <= :lat AND c.north >= :lat', {lat})
        .andWhere('c.west <= :lon AND c.east >= :lon', {lon})
        .orderBy('(c.north - c.south) * (c.east - c.west)', 'ASC')
        .getMany();
    }

}
