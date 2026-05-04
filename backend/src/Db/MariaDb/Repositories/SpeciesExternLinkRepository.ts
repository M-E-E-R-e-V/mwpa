import {DBRepository} from 'figtree';
import {SpeciesExternLink} from '../Entities/SpeciesExternLink.js';

/**
 * SpeciesExternLink repository
 */
export class SpeciesExternLinkRepository extends DBRepository<SpeciesExternLink> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'species_extern_link';

    /**
     * Retrun a instance
     * @return {SpeciesExternLinkRepository}
     */
    public static getInstance(): SpeciesExternLinkRepository {
        return super.getSingleInstance(SpeciesExternLink);
    }

    /**
     * Find the link mapping a local species to an external receiver's species namespace.
     * @param {number} externalReceiverId
     * @param {number} speciesId
     * @return {SpeciesExternLink | null}
     */
    public async findByReceiverAndSpecies(externalReceiverId: number, speciesId: number): Promise<SpeciesExternLink | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                external_receiver_id: externalReceiverId,
                species_id: speciesId
            }
        });
    }

}