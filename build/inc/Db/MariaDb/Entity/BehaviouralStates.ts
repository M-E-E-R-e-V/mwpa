import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'behavioural_states'})
export class BehaviouralStates extends BaseEntity {

    /**
     * id for behavioural states
     */
    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
        // @ts-ignore
    name: string;

    /**
     * description
     */
    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

}