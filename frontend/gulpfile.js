// eslint-disable-next-line @typescript-eslint/no-var-requires
const gulp = require('gulp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetGoogleFonts = require('get-google-fonts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {exec} = require('child_process');

const currentPath = './';
const assetsPath = `${currentPath}assets/`;

/**
 * copy-data
 * for frontend to assets
 */
gulp.task('copy-data', async() => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const downloadGoogleFont = async() => {
        const ggf = new GetGoogleFonts({
            outputDir: `${assetsPath}css/fonts`
        });

        console.log('Load Google fonts ...');

        await ggf.download('https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback');

        console.log('finish.');

        return true;
    };

    return gulp.src([
        '../frontend/node_modules/admin-lte/plugins/**/*'
    ])
    .pipe(gulp.dest('../frontend/assets/plugins'))

        &&

        // single files
        gulp.src([
            '../frontend/node_modules/admin-lte/dist/js/adminlte.js',
            '../frontend/node_modules/requirejs/require.js'
        ])
        .pipe(gulp.dest('../frontend/assets'))

        &&

        gulp.src([
            '../frontend/node_modules/ionicons-css/dist/**/*'
        ])
        .pipe(gulp.dest('../frontend/assets/ionicons-css'))

        &&

        gulp.src([
            '../frontend/node_modules/admin-lte/dist/css/**/*'
        ])
        .pipe(gulp.dest('../frontend/assets/css'))

        &&

        downloadGoogleFont();
});

// ---------------------------------------------------------------------------------------------------------------------

gulp.task('setup-bambooo', (cb) => {
    exec('cd node_modules && rm -R bambooo && git submodule add -f https://github.com/stefanwerfling/bambooo.git', (err, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('clone-bambooo', (cb) => {
    exec('cd node_modules && rm -R bambooo && git clone https://github.com/stefanwerfling/bambooo.git', (err, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('build-bambooo', (cb) => {
    exec('cd node_modules/bambooo && npm install && npm run build', (err, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('default', gulp.parallel('copy-data'));