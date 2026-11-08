import {defineConfig} from 'vitest/config';

/*
 * Frontend test runner.
 *
 * Vitest is picked over node:test because the frontend source uses
 * webpack-style extensionless imports (`from './Lang'`) which Node's
 * native ESM loader rejects. Vitest's resolver speaks the same
 * dialect as the webpack build, so test files can import the real
 * production modules without a separate compile pass.
 *
 * `happy-dom` is needed even for pure-math tests because importing
 * `LocationPickerModal` (and most other widgets) transitively loads
 * `bambooo` → `bs-stepper`, which touches `window` at module-eval
 * time. happy-dom provides a minimal `window`/`document` stub at
 * roughly 1/10th the cost of jsdom.
 *
 * `test/setup.ts` redirects bambooo's eager, uninstalled v2 Map/PDF/Scanner
 * peers (jsvectormap, pdfjs-dist, barcode-detector, zxing-wasm) to an empty
 * stub so importing a widget does not crash the suite — the test-time mirror of
 * the webpack build's `resolve.alias: {<peer>: false}`.
 */
export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        environment: 'happy-dom',
        setupFiles: ['./test/setup.ts']
    }
});