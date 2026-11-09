import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * History
 *
 * Change log of edited rows: one row per changed field, plus one row for a
 * create / delete event. All fields of one save share a change_group.
 */
@Entity({
    name: 'history'
})
@Index(['table_name', 'row_id'])
export class History extends DBBaseEntityId {

    /**
     * Table of the changed row, e.g. 'sighting'.
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public table_name!: string;

    /**
     * Id of the changed row.
     */
    @Column({
        default: 0
    })
    public row_id!: number;

    /**
     * Groups the rows written by one save (uuid).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public change_group!: string;

    /**
     * 'create', 'update' or 'delete'.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'update'
    })
    public action!: string;

    /**
     * Changed column; empty for an event without field.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public field!: string;

    @Column({
        type: 'mediumtext',
        nullable: true
    })
    public old_value!: string | null;

    @Column({
        type: 'mediumtext',
        nullable: true
    })
    public new_value!: string | null;

    /**
     * User who made the change.
     */
    @Index()
    @Column({
        default: 0
    })
    public changer_id!: number;

    /**
     * Unix seconds.
     */
    @Index()
    @Column({
        default: 0
    })
    public change_time!: number;

    /**
     * 'web' or 'mobile'.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: ''
    })
    public source!: string;

}