/**
 * Minimum-interval rate limiter — serialises calls and enforces a wait
 * between consecutive requests. One instance per upstream API so that
 * each provider gets its own budget independent of the others.
 */
export class RateLimiter {

    /**
     * Minimum interval between two consecutive calls, in ms.
     * @private
     */
    private readonly _intervalMs: number;

    /**
     * Promise tail — chaining onto this serialises callers.
     * @private
     */
    private _tail: Promise<void> = Promise.resolve();

    /**
     * Epoch ms of the most recent run start (0 = never).
     * @private
     */
    private _lastRun: number = 0;

    /**
     * @param {number} intervalMs minimum delay between two consecutive calls
     */
    public constructor(intervalMs: number) {
        this._intervalMs = intervalMs;
    }

    /**
     * Run fn after waiting until at least intervalMs have passed since the
     * previous run, and serialised behind any other in-flight calls.
     */
    public async schedule<T>(fn: () => Promise<T>): Promise<T> {
        const previous = this._tail;
        let release: () => void = (): void => {
            // replaced synchronously below
        };
        this._tail = new Promise<void>((resolve): void => {
            release = resolve;
        });

        try {
            await previous;
            const wait = this._intervalMs - (Date.now() - this._lastRun);

            if (wait > 0) {
                await new Promise<void>((resolve): void => {
                    setTimeout(resolve, wait);
                });
            }

            this._lastRun = Date.now();
            return await fn();
        } finally {
            release();
        }
    }

    /**
     * Force the next call to wait at least extraMs from now (used after a 429).
     */
    public penalize(extraMs: number): void {
        const cutoff = Date.now() - this._intervalMs + extraMs;

        if (cutoff > this._lastRun) {
            this._lastRun = cutoff;
        }
    }

}