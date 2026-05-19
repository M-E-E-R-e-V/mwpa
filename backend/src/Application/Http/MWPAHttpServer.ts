import {HttpServer} from 'figtree';

/**
 * MWPA-flavoured HTTP server.
 *
 * Loosens figtree's default Content-Security-Policy for two things the
 * frontend needs:
 *
 *   - **`worker-src 'self' blob:`** — OpenLayers' Heatmap layer (and any
 *     other worker-driven viz) spawns workers from Blob URLs. Without an
 *     explicit `worker-src`, the browser falls back to `child-src 'self'`
 *     and blocks the worker.
 *   - **`frame-src` with OneZoom** — the species detail view embeds
 *     `onezoom.org` (interactive tree-of-life) in an iframe.
 *
 * Subclassing is the right hook — figtree exposes `_getCspDirectives()`
 * as a `protected` extension point. (We deliberately do **not** patch
 * `node_modules/figtree/...`: those edits get blown away by every
 * `npm install`, and we burnt ourselves on exactly that during the
 * 1.0.34 release when the previous vendor-patch was lost.)
 */
export class MWPAHttpServer extends HttpServer {

    protected override _getCspDirectives(): Record<string, string[]> {
        const base = super._getCspDirectives();
        return {
            ...base,
            workerSrc: ['\'self\'', 'blob:'],
            frameSrc: [
                ...(base.frameSrc ?? ['\'self\'']),
                'https://www.onezoom.org',
                'https://onezoom.org'
            ]
        };
    }

}