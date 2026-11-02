/**
 * CLI entry for the one-time sighting_old import (see SightingOldImporter).
 *
 * Usage (after `npm run compile -w backend`):
 *   node backend/dist/Scripts/ImportSightingOld.js \
 *     --excel "data/<historical-export>.xlsx" \
 *     --host 127.0.0.1 --port 3306 --user root --password <pw> --database mwpa \
 *     [--tolerance 30] [--commit]
 *
 * --excel is REQUIRED (the source workbook lives under the gitignored data/
 * dir and is never committed).
 */
import {SightingOldImporter} from './SightingOld/SightingOldImporter.js';

new SightingOldImporter(SightingOldImporter.parseArgs(process.argv.slice(2)))
.run()
.then((code) => {
    process.exitCode = code;
})
.catch((e: unknown) => {
    console.error('ERR', e instanceof Error ? e.message : e);
    process.exitCode = 1;
});