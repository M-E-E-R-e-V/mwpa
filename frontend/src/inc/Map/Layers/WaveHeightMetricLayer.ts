import {MetricColorScale} from '../Styles/MetricColorScale';
import {MetricLayer} from './MetricLayer';

/**
 * Significant wave height, day mean (m). Sourced from Open-Meteo
 * marine API. Range 0–5 m covers typical Canary Islands conditions
 * (calm-to-rough); higher values exist during winter storms but
 * clamp to deep blue. Blue gradient signals "sea state intensity"
 * without competing visually with the temperature ramps.
 */
export class WaveHeightMetricLayer extends MetricLayer {

    public constructor() {
        // ColorBrewer Blues 5-class.
        super(new MetricColorScale(
            ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
            0,
            5
        ));
    }

    public override getName(): string {
        return 'metric_wave_height_layer';
    }

    public override getTitle(): string {
        return 'Wave height (m, daily mean)';
    }

    public override getProvenance(): string {
        return 'Open-Meteo marine API (significant wave height)';
    }

    public override getUnit(): string {
        return 'm significant wave height, daily mean';
    }

}