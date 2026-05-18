import {MetricColorScale} from '../Styles/MetricColorScale';
import {MetricLayer} from './MetricLayer';

/**
 * Commercial fishing-effort hours inside a 25 km radius of each
 * sighting on the sighting day, sourced from Global Fishing Watch via
 * the backend FishingEffortService. Higher values = stronger AIS-
 * derived vessel pressure in the immediate area.
 *
 * Range hard-coded to 0..50 fishing-hours/day — typical Atlantic
 * coastal pressure rarely exceeds that; deep-sea pockets do, but they
 * clamp to red which is fine for an "at a glance" overlay. Reds/oranges
 * picked from ColorBrewer YlOrRd so the layer reads as "pressure" even
 * when stacked over chlorophyll.
 */
export class FishingEffortMetricLayer extends MetricLayer {

    public constructor() {
        super(new MetricColorScale(
            ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'],
            0,
            50
        ));
    }

    public override getName(): string {
        return 'metric_fishing_effort_layer';
    }

    public override getTitle(): string {
        return 'Fishing effort (h/day, 25 km)';
    }

    public override getProvenance(): string {
        return 'Global Fishing Watch 4wings/stats (AIS-derived)';
    }

    public override getUnit(): string {
        return 'fishing hours / day @ 25 km radius';
    }

}