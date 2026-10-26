import Mod from 'node:module';

/*
 * Redirect bambooo v2's optional, uninstalled peers to an empty module at the
 * Node CommonJS loader. bambooo ships as externalized CJS, so its inner
 * `require('jsvectormap')` etc. is resolved by Node — bypassing Vite's
 * `resolve.alias`. Short-circuiting `Module._load` is the one hook that reliably
 * intercepts that require; MWPA calls none of these widgets, so returning an
 * empty object is enough. Mirrors the webpack build's `resolve.alias` for them.
 */
const PEER = /^(jsvectormap|pdfjs-dist|barcode-detector|zxing-wasm)(\/|$)/u;

type LoadFn = (request: string, ...rest: unknown[]) => unknown;
const moduleCtor = Mod as unknown as {_load: LoadFn;};
const original: LoadFn = moduleCtor._load;

moduleCtor._load = function _load(request: string, ...rest: unknown[]): unknown {
    if (PEER.test(request)) {
        return {};
    }

    return original.call(this, request, ...rest);
};