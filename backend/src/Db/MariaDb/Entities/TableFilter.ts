import {DBBaseEntityUnid} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * A named, private filter/sort preset of a frontend list table (e.g. the
 * sighting list). Shown as sub entry below the table's page in the side
 * menu. `settings` is a JSON document whose shape is owned by the frontend
 * table (e.g. SightingTableFilterSettings). Ported from kavula (#94).
 *
 * Not to be confused with the legacy, user-less `sighting_view_filter`.
 */
@Entity({name: 'table_filter'})
@Index(['user_id', 'table_name'])
export class TableFilter extends DBBaseEntityUnid {

    /**
     * owner (user.id) — presets are private
     */
    @Column({type: 'int', default: 0})
    public user_id!: number;

    /**
     * frontend table key (TableFilterTable)
     */
    @Column({type: 'varchar', length: 64, default: ''})
    public table_name!: string;

    /**
     * display name (menu entry)
     */
    @Column({type: 'varchar', length: 128, default: ''})
    public name!: string;

    /**
     * JSON settings (sorting + filters)
     */
    @Column({type: 'text', nullable: true})
    public settings!: string|null;

    /**
     * menu order
     */
    @Column({type: 'int', default: 0})
    public position!: number;

    /**
     * creation timestamp
     */
    @Column({type: 'datetime'})
    public created!: Date;

}