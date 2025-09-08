import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Species Entity
 */
@Entity({name: 'species'})
export class Species extends DBBaseEntityId {

    /**
     * ott id
     * @see https://github.com/OpenTreeOfLife/germinator/wiki/TNRS-API-v3
     * @see https://www.onezoom.org/life.html/@=<id>
     * @see https://tree.opentreeoflife.org/taxonomy/browse?id=<id>
     */
    @Index()
    @Column({
        default: 0
    })
    public ott_id!: number;

    /**
     * name of specie
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
    public name!: string;

    /**
     * species group id
     * a intern id for sorting and coloring
     */
    @Index()
    @Column({
        default: 0
    })
    public species_groupid!: number;

    /**
     * is deleted
     * mark for entry is deleted (not selectable, only show as history)
     */
    @Column({
        default: false
    })
    public isdeleted!: boolean;

}