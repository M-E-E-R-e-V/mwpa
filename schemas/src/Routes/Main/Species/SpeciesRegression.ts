import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SpeciesRegressionRequest
 * Filter for the cross-species regression matrix
 */
export const SchemaSpeciesRegressionRequest = Vts.object({
    period_from: Vts.optional(Vts.string()),
    period_to: Vts.optional(Vts.string()),
}, {
    description: 'Filter for the cross-species regression matrix',
});

/**
 * Type of schema SpeciesRegressionRequest
 */
export type SpeciesRegressionRequest = ExtractSchemaResultType<typeof SchemaSpeciesRegressionRequest>;

/**
 * Schema of SpeciesRegressionPoint
 * Single scatter point with optional tooltip label
 */
export const SchemaSpeciesRegressionPoint = Vts.object({
    x: Vts.number(),
    y: Vts.number(),
    label: Vts.optional(Vts.string()),
}, {
    description: 'Single scatter point with optional tooltip label',
});

/**
 * Type of schema SpeciesRegressionPoint
 */
export type SpeciesRegressionPoint = ExtractSchemaResultType<typeof SchemaSpeciesRegressionPoint>;

/**
 * Schema of SpeciesRegressionFit
 * Ordinary-least-squares fit (slope/intercept/R²/n)
 */
export const SchemaSpeciesRegressionFit = Vts.object({
    slope: Vts.number(),
    intercept: Vts.number(),
    r2: Vts.number({description: 'Coefficient of determination (0..1; 0 if undefined)'}),
    n: Vts.number(),
}, {
    description: 'Ordinary-least-squares fit (slope/intercept/R²/n)',
});

/**
 * Type of schema SpeciesRegressionFit
 */
export type SpeciesRegressionFit = ExtractSchemaResultType<typeof SchemaSpeciesRegressionFit>;

/**
 * Schema of SpeciesRegressionSeries
 * One species' points + per-species regression fit
 */
export const SchemaSpeciesRegressionSeries = Vts.object({
    species_id: Vts.number(),
    species_name: Vts.string(),
    color: Vts.string({description: 'CSS color taken from the species_group (or auto-assigned)'}),
    points: Vts.array(SchemaSpeciesRegressionPoint),
    fit: Vts.optional(SchemaSpeciesRegressionFit),
}, {
    description: 'One species\' points + per-species regression fit',
});

/**
 * Type of schema SpeciesRegressionSeries
 */
export type SpeciesRegressionSeries = ExtractSchemaResultType<typeof SchemaSpeciesRegressionSeries>;

/**
 * Schema of SpeciesRegressionChart
 * One scatter chart (x/y label + series + pooled fit)
 */
export const SchemaSpeciesRegressionChart = Vts.object({
    id: Vts.string({description: 'Stable chart key (e.g. \'year_spue\', \'sst_groupsize\')'}),
    title_key: Vts.string(),
    desc_key: Vts.string(),
    x_label_key: Vts.string(),
    y_label_key: Vts.string(),
    min_n_per_series: Vts.number({description: 'Minimum points per species required to draw a per-species fit line'}),
    series: Vts.array(SchemaSpeciesRegressionSeries),
    pooled_fit: Vts.optional(SchemaSpeciesRegressionFit),
}, {
    description: 'One scatter chart (x/y label + series + pooled fit)',
});

/**
 * Type of schema SpeciesRegressionChart
 */
export type SpeciesRegressionChart = ExtractSchemaResultType<typeof SchemaSpeciesRegressionChart>;

/**
 * Schema of SpeciesRegressionMatrixResponse
 * Response carrying all configured regression scatters
 */
export const SchemaSpeciesRegressionMatrixResponse = SchemaDefaultReturn.extend({
    charts: Vts.optional(Vts.array(SchemaSpeciesRegressionChart)),
}, {
    description: 'Response carrying all configured regression scatters',
});

/**
 * Type of schema SpeciesRegressionMatrixResponse
 */
export type SpeciesRegressionMatrixResponse = ExtractSchemaResultType<typeof SchemaSpeciesRegressionMatrixResponse>;