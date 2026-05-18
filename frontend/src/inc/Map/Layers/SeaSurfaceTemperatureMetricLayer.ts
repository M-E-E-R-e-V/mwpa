import {MetricColorScale} from '../Styles/MetricColorScale';
import {MetricLayer} from './MetricLayer';

/**
 * Sea-surface temperature, day mean (°C). Sourced from Open-Meteo
 * via the backend WeatherService. The range is tuned for the
 * Canary Islands / Eastern Atlantic (typical 18–27 °C). Use a
 * cool→warm ramp (blue → yellow → red) so the meaning reads
 * intuitively without a legend lookup.
 */
export class SeaSurfaceTemperatureMetricLayer extends MetricLayer {

    public constructor() {
        // ColorBrewer RdYlBu reversed (cool to warm).
        super(new MetricColorScale(
            ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
            18,
            27
        ));
    }

    public override getName(): string {
        return 'metric_sst_layer';
    }

    public override getTitle(): string {
        return 'Sea surface temperature (°C)';
    }

    public override getProvenance(): string {
        return 'Open-Meteo marine API (daily mean SST)';
    }

    public override getUnit(): string {
        return '°C surface, daily mean';
    }

}