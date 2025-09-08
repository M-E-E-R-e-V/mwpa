import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * ExternalReceiver
 */
@Entity({name: 'external_receiver'})
export class ExternalReceiver extends DBBaseEntityId {

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