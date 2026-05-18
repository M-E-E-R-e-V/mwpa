import {MetricColorScale} from '../Styles/MetricColorScale';
import {MetricLayer} from './MetricLayer';

/**
 * 2 m air temperature, day mean (°C). Sourced from Open-Meteo via
 * the backend WeatherService. Wider range than SST (10–35 °C)
 * because the Canary Islands have larger diurnal swings inland
 * during summer. Same cool→warm ramp as SST so the two layers
 * compare visually.
 */
export class AirTemperatureMetricLayer extends MetricLayer {

    public constructor() {
        super(new MetricColorScale(
            ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
            10,
            35
        ));
    }

    public override getName(): string {
        return 'metric_air_temp_layer';
    }

    public override getTitle(): string {
        return 'Air temperature (°C, 2m)';
    }

    public override getProvenance(): string {
        return 'Open-Meteo forecast API (daily mean 2m air temp)';
    }

    public override getUnit(): string {
        return '°C @ 2m, daily mean';
    }

}