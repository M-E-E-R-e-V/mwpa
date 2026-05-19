import {HttpService, Logger, ServiceError, WebSocketServer} from 'figtree';
import {SchemaConfigHttpServer, ServiceStatus} from 'figtree-schemas';
import {v4 as uuid} from 'uuid';
import {MWPAConfig} from '../../Config/MWPAConfig.js';
import {MWPAHttpServer} from './MWPAHttpServer.js';

/**
 * MWPA `HttpService` — same wiring as figtree's `HttpService`, but
 * instantiates {@link MWPAHttpServer} instead of figtree's stock
 * `HttpServer`. We have to override `start()` in full because figtree
 * hard-codes the `new HttpServer(...)` call and offers no factory hook
 * to swap the server class.
 *
 * Keep this method in lockstep with `figtree/dist/Application/Services/
 * HttpService.js::start()` when bumping figtree — the body is a verbatim
 * copy minus the one server-class swap.
 */
export class MWPAHttpService extends HttpService {

    public override async start(): Promise<void> {
        this._inProcess = true;
        this._status = ServiceStatus.Progress;

        try {
            const tConfig = MWPAConfig.getInstance().get();
            if (tConfig === null) {
                throw new ServiceError(this.constructor.name, 'Config is null. Check your config file exists!');
            }
            if (tConfig.httpserver && !SchemaConfigHttpServer.validate(tConfig.httpserver, [])) {
                throw new ServiceError(
                    this.constructor.name,
                    'Configuration is invalid. Check your config file format and values.'
                );
            }

            let aport = 3000;
            let publicDir = '';
            let sslPath = '';
            let sessionSecret = uuid();
            let sessionCookiePath = '/';
            let sessionCookieMaxAge = 6000000;

            if (tConfig.httpserver) {
                if (tConfig.httpserver.port) {
                    aport = tConfig.httpserver.port;
                }
                if (tConfig.httpserver.publicdir) {
                    publicDir = tConfig.httpserver.publicdir;
                }
                if (tConfig.httpserver.session) {
                    if (tConfig.httpserver.session.secret) {
                        sessionSecret = tConfig.httpserver.session.secret;
                    }
                    if (tConfig.httpserver.session.cookie_path) {
                        sessionCookiePath = tConfig.httpserver.session.cookie_path;
                    }
                    if (tConfig.httpserver.session.cookie_max_age) {
                        sessionCookieMaxAge = tConfig.httpserver.session.cookie_max_age;
                    }
                }
                if (tConfig.httpserver.sslpath) {
                    sslPath = tConfig.httpserver.sslpath;
                }
            }

            let proxy;
            if (tConfig.httpserver?.proxy) {
                proxy = {trust: tConfig.httpserver.proxy.trust};
            }
            let csrf;
            if (tConfig.httpserver?.csrf) {
                csrf = {cookie: tConfig.httpserver.csrf.cookie};
            }

            // The single line that differs from figtree's HttpService:
            // MWPAHttpServer adds workerSrc / extended frameSrc to the CSP.
            this._server = new MWPAHttpServer({
                realm: MWPAConfig.getInstance().getAppTitle(),
                port: aport,
                session: {
                    secret: sessionSecret,
                    cookie_path: sessionCookiePath,
                    ssl_path: sslPath,
                    max_age: sessionCookieMaxAge
                },
                routes: await this._loader.loadRoutes(),
                publicDir: publicDir,
                crypt: {
                    sslPath: sslPath,
                    key: 'server.pem',
                    crt: 'server.crt'
                },
                proxy: proxy,
                csrf: csrf
            });
            await this._server.setupAndListen();

            if (this._wsOptions) {
                this._wsServer = new WebSocketServer(this._server, this._wsOptions.server);
                const endpoints = await this._wsOptions.loader.loadEndpoints();
                for (const endpoint of endpoints) {
                    this._wsServer.addEndpoint(endpoint);
                }
                this._wsServer.start();
            }
        } catch (error) {
            this._status = ServiceStatus.Error;
            this._inProcess = false;
            this._statusMsg = `MWPAHttpService::start: Error while create the HTTPServer: ${(error as Error).message}`;
            Logger.getLogger().error(this._statusMsg);
            throw error;
        }

        this._statusMsg = '';
        this._status = ServiceStatus.Success;
        this._inProcess = false;
    }

}