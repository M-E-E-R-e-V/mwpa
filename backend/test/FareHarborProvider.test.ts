import assert from 'node:assert/strict';
import {after, before, describe, it} from 'node:test';
import {FareHarborProvider} from '../src/Service/ExternalTour/Providers/FareHarborProvider.js';
import {ExternalTourSourceConfig} from '../src/Service/ExternalTour/Types.js';

/**
 * `Logger.getLogger()` is normally wired up by figtree's bootstrap.
 * For these pure-function tests we don't load the bootstrap, so we
 * stub the logger BEFORE importing anything that reaches into it
 * indirectly (the provider only uses it inside its `_getJson` helper,
 * triggered by fetch calls — which we stub out).
 *
 * The actual reach-through happens via `import {Logger} from 'figtree'`;
 * mocking that without a heavy framework is more trouble than it's
 * worth here. The fetch-stub returns successful responses, so the
 * warn-path that touches the logger never fires in these tests.
 */

const baseConfig: ExternalTourSourceConfig = {
    base_url: 'https://fareharbor.com/api/v1',
    company_shortname: 'whalewatching-gomera',
    item_pks: ['326313']
};

/**
 * Recorded URLs of every `fetch` call made during a single test —
 * easier to assert against than mocking the full http pipeline.
 */
let capturedUrls: string[];
let originalFetch: typeof globalThis.fetch;

const installFetchStub = (responder: (url: string) => unknown): void => {
    capturedUrls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async(input: RequestInfo | URL): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.toString();
        capturedUrls.push(url);
        const body = responder(url);
        return new Response(JSON.stringify(body ?? {}), {
            status: 200,
            headers: {'Content-Type': 'application/json'}
        });
    }) as typeof globalThis.fetch;
};

const restoreFetch = (): void => {
    globalThis.fetch = originalFetch;
};

describe('FareHarborProvider', () => {

    /**
     * Regression for the bug that wasted 6 cron ticks: FareHarbor's
     * /calendar/{year}/{month}/ endpoint requires a zero-padded month —
     * /calendar/2026/5/ → 404, /calendar/2026/05/ → 200. Verifies the
     * built URLs ALWAYS pad, for any single-digit month.
     */
    it('zero-pads single-digit months in calendar URLs', async() => {
        installFetchStub(() => ({calendar: {weeks: []}}));

        try {
            const provider = new FareHarborProvider();
            await provider.fetchSchedule(
                baseConfig,
                new Date(Date.UTC(2026, 0, 15)),  // 2026-01-15
                new Date(Date.UTC(2026, 8, 15))   // 2026-09-15 → months 1..9
            );

            const calendarUrls = capturedUrls.filter((u) => u.includes('/calendar/'));
            for (const url of calendarUrls) {
                assert.match(
                    url,
                    /\/calendar\/\d{4}\/\d{2}\//,
                    `expected zero-padded month in URL, got ${url}`
                );
            }

            // Spot-check: month 1 must show as /01/, not /1/.
            assert.ok(
                calendarUrls.some((u) => u.includes('/calendar/2026/01/')),
                'expected at least one URL with /2026/01/'
            );
            assert.ok(
                !calendarUrls.some((u) => /\/calendar\/2026\/[1-9]\//.test(u)),
                'no URL should have an unpadded single-digit month'
            );
        } finally {
            restoreFetch();
        }
    });

    /**
     * Window-iteration spans every month touched, even partially.
     * Verified indirectly through `fetchSchedule` (the method we care
     * about), counting calendar-fetch calls.
     */
    it('iterates every month in the [from, to] window', async() => {
        installFetchStub(() => ({calendar: {weeks: []}}));

        try {
            const provider = new FareHarborProvider();
            await provider.fetchSchedule(
                baseConfig,
                new Date(Date.UTC(2026, 4, 18)),  // 2026-05-18
                new Date(Date.UTC(2026, 6, 1))    // 2026-07-01 → months 5,6,7
            );

            const calendarUrls = capturedUrls.filter((u) => u.includes('/calendar/'));
            // 1 item × 3 months = 3 calendar requests.
            assert.equal(calendarUrls.length, 3);
            assert.ok(calendarUrls.some((u) => u.includes('/2026/05/')));
            assert.ok(calendarUrls.some((u) => u.includes('/2026/06/')));
            assert.ok(calendarUrls.some((u) => u.includes('/2026/07/')));
        } finally {
            restoreFetch();
        }
    });

    /**
     * Window that crosses a year boundary still enumerates the
     * December → January transition correctly. Off-by-one in the
     * month iterator would either miss December or duplicate
     * January.
     */
    it('walks across a year boundary', async() => {
        installFetchStub(() => ({calendar: {weeks: []}}));

        try {
            const provider = new FareHarborProvider();
            await provider.fetchSchedule(
                baseConfig,
                new Date(Date.UTC(2026, 10, 20)),  // 2026-11-20
                new Date(Date.UTC(2027, 1, 5))     // 2027-02-05 → 2026-11,12 + 2027-01,02
            );

            const calendarUrls = capturedUrls.filter((u) => u.includes('/calendar/'));
            assert.equal(calendarUrls.length, 4);
            assert.ok(calendarUrls.some((u) => u.includes('/2026/11/')));
            assert.ok(calendarUrls.some((u) => u.includes('/2026/12/')));
            assert.ok(calendarUrls.some((u) => u.includes('/2027/01/')));
            assert.ok(calendarUrls.some((u) => u.includes('/2027/02/')));
        } finally {
            restoreFetch();
        }
    });

    /**
     * `fetchSchedule` returns an empty list (no exception) when the
     * config has no company shortname. Defensive: the cron uses it on
     * every tick — a typo in the admin UI shouldn't crash the service.
     */
    it('returns empty when company_shortname is blank', async() => {
        installFetchStub(() => ({}));

        try {
            const provider = new FareHarborProvider();
            const slots = await provider.fetchSchedule(
                {...baseConfig, company_shortname: '  '},
                new Date(),
                new Date(Date.now() + 86400000)
            );
            assert.deepEqual(slots, []);
            assert.equal(capturedUrls.length, 0);
        } finally {
            restoreFetch();
        }
    });

    /**
     * End-to-end happy-path: a single calendar response with one
     * availability, combined with a pricing-overview response,
     * collapses into one ExternalTourSlot whose fields are mapped
     * from the FareHarbor shapes. Pins down the field-by-field
     * mapping so a downstream rename doesn't silently lose data.
     */
    it('maps a populated availability + pricing response to one slot', async() => {
        installFetchStub((url) => {
            if (url.includes('/companies/whalewatching-gomera/items/326313/calendar/')) {
                return {
                    calendar: {
                        weeks: [{
                            days: [{
                                availabilities: [{
                                    pk: 1825742608,
                                    company: {
                                        pk: 73827,
                                        shortname: 'whalewatching-gomera',
                                        name: 'Oceano Whale Watching La Gomera'
                                    },
                                    item: {
                                        pk: 326313,
                                        name: 'Whale Watching Tour La Gomera'
                                    },
                                    start_at: '2026-05-19T09:30:00+01:00',
                                    end_at: '2026-05-19T13:30:00+01:00',
                                    approximate_available_capacity: 7,
                                    headline: 'Dauer: 3-4 Stunden',
                                    is_bookable: true,
                                    is_sold_out: false
                                }]
                            }]
                        }]
                    }
                };
            }
            if (url.includes('/pricing-overview/')) {
                return {
                    price_previews: [
                        {
                            availability: {pk: 1825742608},
                            low_pricing: {price: {offset: 5069}},
                            for_object: {
                                customer_type: {name: 'Erwachsene', note: 'ab 12 Jahre'}
                            }
                        },
                        {
                            availability: {pk: 1825742608},
                            low_pricing: {price: {offset: 3379}},
                            for_object: {
                                customer_type: {name: 'Kind', note: '2-11 Jahre'}
                            }
                        }
                    ]
                };
            }
            if (url.endsWith('/companies/whalewatching-gomera/')) {
                return {
                    default_item_primary_location: {
                        name: 'Puerto de Vueltas',
                        latitude: 28.08093,
                        longitude: -17.33226
                    },
                    processor_currency: 'eur'
                };
            }
            return {};  // item-detail fallthrough
        });

        try {
            const provider = new FareHarborProvider();
            const slots = await provider.fetchSchedule(
                baseConfig,
                new Date(Date.UTC(2026, 4, 1)),
                new Date(Date.UTC(2026, 4, 31))
            );

            assert.equal(slots.length, 1);
            const slot = slots[0];
            assert.equal(slot.external_id, '1825742608');
            assert.equal(slot.item_pk, '326313');
            assert.equal(slot.item_name, 'Whale Watching Tour La Gomera');
            assert.equal(slot.duration_text, 'Dauer: 3-4 Stunden');
            assert.equal(slot.is_bookable, true);
            assert.equal(slot.is_sold_out, false);
            assert.equal(slot.capacity_bookable, 7);
            assert.equal(slot.meeting_lat, 28.08093);
            assert.equal(slot.meeting_lon, -17.33226);
            assert.equal(slot.meeting_name, 'Puerto de Vueltas');
            assert.equal(slot.customer_types.length, 2);
            assert.equal(slot.customer_types[0].name, 'Erwachsene');
            assert.equal(slot.customer_types[0].price_cents, 5069);
            assert.equal(slot.customer_types[1].name, 'Kind');
            assert.equal(slot.customer_types[1].price_cents, 3379);

            // start_at_utc: 2026-05-19T09:30:00+01:00 → 08:30 UTC
            assert.equal(slot.start_at_utc, Math.floor(Date.UTC(2026, 4, 19, 8, 30) / 1000));
            // start_at (local wall-clock as unix seconds): +01:00 offset → 1h ahead of UTC
            assert.equal(slot.start_at, slot.start_at_utc + 3600);
        } finally {
            restoreFetch();
        }
    });

});