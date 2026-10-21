import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * ClimateIndex — monthly basin-scale climate indices, one row per
 * (year, month). A small reference table (a few thousand rows, 1948→now)
 * that analytics and the R-export join to a sighting via its calendar month.
 *
 * Deliberately NOT a per-sighting enricher: these indices are a single value
 * per month for the whole North Atlantic, so storing them per sighting would
 * duplicate the same number thousands of times. Populated by the
 * {@link ClimateIndexService} from the public NOAA CPC / PSL feeds.
 *
 *   - nao — North Atlantic Oscillation (CPC monthly, normalised)
 *   - amo — Atlantic Multidecadal Oscillation (PSL, unsmoothed, detrended)
 *   - oni — Oceanic Niño Index / ENSO (CPC, 3-month season mapped to its
 *           centre month)
 *
 * Each column is nullable: the three feeds have different start years and are
 * upserted independently, so a month may carry only some of the indices.
 */
@Entity({name: 'climate_index'})
export class ClimateIndex extends DBBaseEntityId {

    @Index()
    @Column({default: 0})
    public year!: number;

    /**
     * Calendar month, 1..12.
     */
    @Index()
    @Column({default: 0})
    public month!: number;

    /**
     * North Atlantic Oscillation index (normalised), or null.
     */
    @Column({
        type: 'decimal',
        precision: 6,
        scale: 3,
        nullable: true
    })
    public nao!: number | null;

    /**
     * Atlantic Multidecadal Oscillation (unsmoothed, detrended), or null.
     */
    @Column({
        type: 'decimal',
        precision: 6,
        scale: 3,
        nullable: true
    })
    public amo!: number | null;

    /**
     * Oceanic Niño Index (ENSO, °C anomaly), or null.
     */
    @Column({
        type: 'decimal',
        precision: 6,
        scale: 3,
        nullable: true
    })
    public oni!: number | null;

    /**
     * When any index for this month was last written. NULL = never.
     */
    @Column({
        type: 'datetime',
        nullable: true
    })
    public last_update!: Date | null;

}