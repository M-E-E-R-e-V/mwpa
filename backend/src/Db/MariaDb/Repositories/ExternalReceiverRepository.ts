import {DBRepository} from 'figtree';
import {ExternalReceiver} from '../Entities/ExternalReceiver.js';

/**
 * ExternalReceiver repository
 */
export class ExternalReceiverRepository extends DBRepository<ExternalReceiver> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'external_receiver';

    /**
     * Return an instance
     * @return {ExternalReceiverRepository}
     */
    public static getInstance(): ExternalReceiverRepository {
        return super.getSingleInstance(ExternalReceiver);
    }

    /**
     * All receivers, ordered by id ASC — drives the AROC-report receiver picker.
     * @return {ExternalReceiver[]}
     */
    public async findAllOrdered(): Promise<ExternalReceiver[]> {
        const repository = await this._repository;
        return repository.find({
            order: {id: 'ASC'}
        });
    }

}