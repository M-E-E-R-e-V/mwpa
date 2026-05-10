/**
 * Outcome of a single HTTP GET attempt.
 */
export type HttpGetResponse = {
    status: number;
    body: string;
};

/**
 * Tiny retrying GET helper around the global fetch.
 *
 * Retries on 5xx, 429, and network errors with exponential backoff (base
 * 500 ms, doubled per attempt up to maxAttempts). Honours a request
 * timeout via AbortController. We deliberately don't reach for a heavy
 * HTTP client here — every bathymetry provider does the same handful of
 * GETs.
 */
export const httpGetWithRetry = async(
    url: string,
    options: {timeoutMs?: number; maxAttempts?: number;} = {}
): Promise<HttpGetResponse> => {
    const timeoutMs = options.timeoutMs ?? 15000;
    const maxAttempts = options.maxAttempts ?? 3;

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout((): void => controller.abort(), timeoutMs);

        try {
            // eslint-disable-next-line no-await-in-loop
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {accept: 'application/json,text/csv,text/plain,*/*'}
            });

            // eslint-disable-next-line no-await-in-loop
            const body = await response.text();

            if (response.status >= 500 || response.status === 429) {
                lastError = new Error(`HTTP ${response.status}`);
            } else {
                return {
                    status: response.status,
                    body: body
                };
            }
        } catch (e) {
            lastError = e;
        } finally {
            clearTimeout(timer);
        }

        if (attempt < maxAttempts) {
            const delay = 500 * (2 ** (attempt - 1));
            // eslint-disable-next-line no-await-in-loop
            await new Promise<void>((resolve): void => {
                setTimeout(resolve, delay);
            });
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`GET ${url} failed`);
};