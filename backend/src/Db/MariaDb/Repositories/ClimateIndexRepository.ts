import {DBRepository} from '@stefanwerfling/figtree';
import {ClimateIndex} from '../Entities/ClimateIndex.js';

/**
 * ClimateIndex repository — read/write access to the monthly climate-index
 * reference table. Written in bulk by the ClimateIndexService; read by the
 * analytics / export join.
 */
export class ClimateIndexRepository extends DBRepository<ClimateIndex> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'climate_index';

    /**
     * Return an instance
     */
    public static getInstance(): ClimateIndexRepository {
        return super.getSingleInstance(ClimateIndex);
    }

    /**
     * All rows — the table is small (a few thousand months). Used to build the
     * (year, month) → indices map for the export join and by the service to
     * diff against the freshly fetched feeds.
     */
    public async findAllRows(): Promise<ClimateIndex[]> {
        const repository = await this._repository;

        return repository.find();
    }

    /**
     * Persist a batch of (new or modified) rows in one round-trip.
     */
    public async saveMany(rows: ClimateIndex[]): Promise<void> {
        if (rows.length === 0) {
            return;
        }

        const repository = await this._repository;
        await repository.save(rows);
    }

    /**
     * Construct an unsaved row for a month (used when the service sees a month
     * not yet in the table).
     */
    public async createRow(year: number, month: number): Promise<ClimateIndex> {
        const repository = await this._repository;

        return repository.create({
            year: year,
            month: month,
            nao: null,
            amo: null,
            oni: null,
            last_update: null
        });
    }

}