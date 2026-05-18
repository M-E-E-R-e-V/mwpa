import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {ExternalTourService} from '../src/Service/ExternalTourService.js';
import {ExternalTourProvider, ExternalTourSlot, ExternalTourSourceConfig} from '../src/Service/ExternalTour/Types.js';

/**
 * In-memory provider used to verify constructor injection without
 * hitting the network or the DB.
 */
class StubProvider implements ExternalTourProvider {

    public readonly name: string;

    public calls: Array<{config: ExternalTourSourceConfig; from: Date; to: Date}> = [];

    public constructor(name: string) {
        this.name = name;
    }

    public async fetchSchedule(
        config: ExternalTourSourceConfig,
        fromUtc: Date,
        toUtc: Date
    ): Promise<ExternalTourSlot[]> {
        this.calls.push({config, from: fromUtc, to: toUtc});
        return [];
    }

}

describe('ExternalTourService', () => {

    /**
     * Default-constructed service must register the FareHarbor
     * provider under the 'fareharbor' key. Sources whose
     * `provider` column is 'fareharbor' rely on this exact key —
     * silently renaming it would skip every existing source row.
     */
    it('registers the FareHarbor provider by default', () => {
        const service = new ExternalTourService();
        const providers = (service as unknown as {_providers: Map<string, ExternalTourProvider>})._providers;
        assert.ok(providers.has('fareharbor'),
            'default service should register a provider with name "fareharbor"');
    });

    /**
     * Custom providers passed in to the constructor replace the
     * default — the cron then uses them to satisfy source rows whose
     * `provider` column matches `provider.name`. Multiple providers
     * coexist in the same Map keyed by their `name`.
     */
    it('accepts custom provider injection', () => {
        const a = new StubProvider('alpha');
        const b = new StubProvider('beta');
        const service = new ExternalTourService([a, b]);

        const providers = (service as unknown as {_providers: Map<string, ExternalTourProvider>})._providers;
        assert.equal(providers.size, 2);
        assert.equal(providers.get('alpha'), a);
        assert.equal(providers.get('beta'), b);
        assert.ok(!providers.has('fareharbor'),
            'explicit provider list must not also bring in the default');
    });

    /**
     * The service exposes its cron expression on the base class.
     * Pinning the hourly schedule here so a careless edit doesn't
     * accidentally turn it into every-minute — that would 60× the
     * FareHarbor traffic with no upside, given the slot state
     * changes are minute-granular at best.
     */
    it('runs on an hourly cron schedule', () => {
        const service = new ExternalTourService();
        const cron = (service as unknown as {_cron: string})._cron;
        assert.equal(cron, '0 * * * *');
    });

});