import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ExternalReceiver
 */
@Entity({name: 'external_receiver'})
export class ExternalReceiver extends BaseEntity {

    /**
     * id of receiver
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * name of receiver
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
    public name!: string;

}