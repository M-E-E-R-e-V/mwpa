import {MetricColorScale} from '../Styles/MetricColorScale';
import {MetricLayer} from './MetricLayer';

/**
 * Surface chlorophyll-a concentration (mg/m³) sourced from NOAA
 * CoastWatch ERDDAP via the backend OceanService. Higher values =
 * higher primary productivity = more food in the water column.
 *
 * Range is hard-coded for now: 0..3 mg/m³ covers the bulk of the
 * Canary Islands and Strait of Gibraltar values; the upper end clamps
 * to red for true blooms (>3) without losing resolution at typical
 * working ranges. Swap to a per-tenant config once a second region
 * starts using the page.
 */
export class ChlorophyllMetricLayer extends MetricLayer {

    public constructor() {
        // ColorBrewer YlGn 5-class, low → high.
        super(new MetricColorScale(
            ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'],
            0,
            3
        ));
    }

    public override getName(): string {
        return 'metric_chlorophyll_layer';
    }

    public override getTitle(): string {
        return 'Chlorophyll-a (mg/m³, day mean)';
    }

    public override getProvenance(): string {
        return 'NOAA CoastWatch ERDDAP (erdMH1chla1day)';
    }

    public override getUnit(): string {
        return 'mg/m³ surface chl-a, daily mean';
    }

}