// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

// eslint-disable-next-line no-undef
module.exports = {

    devtool: 'source-map',

    // bundling mode
    mode: 'production',

    // entry files
    entry: {
        'index': './src/index.ts',
        'login': './src/login.ts',
        'service-worker': './src/service-worker.ts'
    },

    // output bundles (location)
    output: {
        // eslint-disable-next-line no-undef
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },

    // file resolutions
    resolve: {
        extensions: ['.ts', '.js'],

        // bambooo's single entry point eagerly re-exports its v2 Map / PDF /
        // Scanner widgets, which import optional peers (jsvectormap, pdfjs-dist,
        // barcode-detector, zxing-wasm) at module-eval time. MWPA uses none of
        // those v2 widgets. `alias: false` resolves each to an EMPTY module, so
        // the eager import returns `{}` instead of throwing — the widget classes
        // still define, and the peers are only touched inside methods MWPA never
        // calls. (IgnorePlugin is wrong here: it removes the module, so the eager
        // require throws "Cannot find module 'jsvectormap'" in the browser.)
        alias: {
            jsvectormap: false,
            'pdfjs-dist': false,
            'barcode-detector': false,
            'zxing-wasm': false
        }
    },

    // loaders
    module: {
        rules: [
            {
                // eslint-disable-next-line require-unicode-regexp
                test: /\.tsx?/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true
                    }
                },
                exclude: '/node_modules/'
            }
        ]
    },

    // plugins
    plugins: [

        // run TSC on a separate thread
        new ForkTsCheckerWebpackPlugin()
    ],

    watch: false
};