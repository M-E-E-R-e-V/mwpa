// eslint-disable-next-line @typescript-eslint/no-var-requires
const gulp = require('gulp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetGoogleFonts = require('get-google-fonts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const download = require('gulp-download-files');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpackConfig = require('./webpack.config.js');
const {exec} = require('child_process');
const fs = require('fs');

const currentPath = './';
const collectionPath = './../';
const assetsPath = `${currentPath}assets/`;

function funcFindNodeModules(nodesModuleName, subdir) {
    const pathIn =  `${currentPath}node_modules/${nodesModuleName}`;

    try {
        // Query the entry
        const stats = fs.lstatSync(pathIn);

        // Is it a directory?
        if (stats.isDirectory()) {
            console.log(`Return path: ${pathIn}/${subdir}`);
            return `${pathIn}/${subdir}`;
        }
    }
    catch (e) {
        // ...
    }

    const pathOut =  `${collectionPath}node_modules/${nodesModuleName}`;

    try {
        // Query the entry
        const stats = fs.lstatSync(pathOut);

        // Is it a directory?
        if (stats.isDirectory()) {
            console.log(`Return path: ${pathOut}/${subdir}`);
            return `${pathOut}/${subdir}`;
        }
    }
    catch (e) {
        // ...
    }

    console.log(`Error: Path not found for module: ${nodesModuleName}`);
    throw new Error(`Path not found for module: ${nodesModuleName}`);
}

/**
 * copy-data
 * for frontend to assets
 */
gulp.task('copy-data', async() => {
    const downloadGoogleFont = async() => {
        const ggf = new GetGoogleFonts({
            outputDir: `${assetsPath}css/fonts`
        });

        console.log('Load Google fonts ...');

        await ggf.download('https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback');

        console.log('finish.');

        return true;
    };

    // Await each copy to completion. The old `&&`-chained form did NOT wait for
    // the (async) gulp streams (`&&` only tests truthiness), which could race
    // and cut copies off. Sequential awaits make the copy deterministic.
    const streamDone = (stream) => new Promise((resolve, reject) => {
        stream.on('error', reject).on('finish', resolve).on('end', resolve);
    });

    const copy = (src, dest) => streamDone(gulp.src(src).pipe(gulp.dest(dest)));

    // AdminLTE 4 vanilla bundle (wires data-lte-toggle via delegation).
    await copy(funcFindNodeModules('admin-lte', 'dist/js/adminlte.js'), assetsPath);

    await copy(funcFindNodeModules('ionicons-css', 'dist/**/*'), `${assetsPath}ionicons-css`);

    // AdminLTE 4 theme CSS (adminlte.css).
    await copy(funcFindNodeModules('admin-lte', 'dist/css/**/*'), `${assetsPath}css`);

    await copy(funcFindNodeModules('bambooo', 'bambooo.css'), `${assetsPath}css`);

    // AdminLTE 4 no longer vendors plugins/ (jquery, moment, select2, …) — those
    // stay in assets/plugins/ from the previous build. BUT it also no longer
    // ships Bootstrap: pull the Bootstrap 5 bundle (incl. Popper) from the
    // bootstrap package, overwriting the legacy Bootstrap 4 bundle on disk.
    await copy([
        funcFindNodeModules('bootstrap', 'dist/js/bootstrap.bundle.min.js'),
        funcFindNodeModules('bootstrap', 'dist/js/bootstrap.bundle.min.js.map'),
    ], `${assetsPath}plugins/bootstrap/js`);

    await downloadGoogleFont();
});

gulp.task('build-webpack', () => {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line consistent-return
        webpack(webpackConfig, (err, stats) => {
            if (err) {
                return reject(err);
            }

            if (stats.hasErrors()) {
                return reject(new Error(stats.compilation.errors.join('\n')));
            }

            resolve();
        });
    });
});

// ---------------------------------------------------------------------------------------------------------------------

// all builds
gulp.task('default', gulp.parallel('copy-data', 'build-webpack'));