import {BaseHttpServerOptions, HttpServer, HttpService} from '@stefanwerfling/figtree';
import {MWPAHttpServer} from './MWPAHttpServer.js';

/**
 * MWPA `HttpService` — identical wiring to figtree's `HttpService`, but
 * swaps the stock `HttpServer` for {@link MWPAHttpServer} (which loosens
 * the CSP for the map/worker needs).
 *
 * figtree 1.1.0 exposes the `_createServer` factory hook for exactly this
 * purpose, so we no longer copy `start()` verbatim: the full server
 * lifecycle (CSRF/proxy wiring, WebSocket endpoints, plugin middleware,
 * and any future additions) is inherited from the base class and only the
 * server instance is overridden here.
 */
export class MWPAHttpService extends HttpService {

    /**
     * Factory hook — return the CSP-relaxed MWPA server instead of the
     * stock figtree `HttpServer`.
     * @param {BaseHttpServerOptions} options
     * @return {HttpServer}
     * @protected
     */
    protected override _createServer(options: BaseHttpServerOptions): HttpServer {
        return new MWPAHttpServer(options);
    }

}
