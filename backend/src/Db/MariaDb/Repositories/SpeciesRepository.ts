import {DBRepository} from 'figtree';
import {Species} from '../Entities/Species.js';
import {SpeciesGroup} from '../Entities/SpeciesGroup.js';

/**
 * Species row joined with its species group (left join on species_groupid).
 */
export type SpeciesWithGroup = {
    id: number;
    name: string;
    ott_id: number;
    isdeleted: boolean;
    species_groupid: number;
    group_name: string;
    group_color: string;
};

/**
 * Species repository
 */
export class SpeciesRepository extends DBRepository<Species> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'species';

    /**
     * Retrun a instance
     * @return {SpeciesRepository}
     */
    public static getInstance(): SpeciesRepository {
        return super.getSingleInstance(Species);
    }

    /**
     * Return all species joined with their species group.
     * @return {SpeciesWithGroup[]}
     */
    public async findAllWithGroup(): Promise<SpeciesWithGroup[]> {
        const repository = await this._repository;
        const rows = await repository
            .createQueryBuilder('species')
            .leftJoinAndSelect(
                SpeciesGroup,
                'group',
                'species.species_groupid = group.id'
            )
            .getRawMany();

        return rows.map((row) => ({
            id: row.species_id,
            name: row.species_name,
            ott_id: row.species_ott_id,
            isdeleted: Boolean(row.species_isdeleted),
            species_groupid: row.group_id ?? 0,
            group_name: row.group_name ?? '',
            group_color: row.group_color ?? ''
        }));
    }

}