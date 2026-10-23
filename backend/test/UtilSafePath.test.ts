import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import Path from 'node:path';
import {UtilSafePath} from '../src/Utils/UtilSafePath.js';

/**
 * Locks in the path-traversal defence used by the sighting image handlers
 * (GetImage/ImageSave/ImageExist) and the tile cache. A regression here
 * re-opens arbitrary file read/write, so the malicious inputs must stay null.
 */
describe('UtilSafePath.safeSegment', () => {

    it('accepts plain filenames unchanged', () => {
        assert.equal(UtilSafePath.safeSegment('photo_123.jpg'), 'photo_123.jpg');
        assert.equal(UtilSafePath.safeSegment('abc-DEF_9.png'), 'abc-DEF_9.png');
    });

    it('rejects traversal, separators, absolute paths, NUL and dot segments', () => {
        // Input is already URL-decoded when safeSegment runs, so the real
        // payload is '../..', not '..%2f..'. A space is a legal filename char
        // and is intentionally NOT rejected.
        for (const bad of [
            '../etc/passwd', '..', '.', 'a/b', '/etc/passwd',
            'sub/dir/file', '', '....//', 'x\0y'
        ]) {
            assert.equal(UtilSafePath.safeSegment(bad), null, bad);
        }
    });

    it('rejects non-strings', () => {
        assert.equal(UtilSafePath.safeSegment(undefined), null);
        assert.equal(UtilSafePath.safeSegment(42), null);
        assert.equal(UtilSafePath.safeSegment(null), null);
    });

    it('isInside confirms containment and blocks escapes', () => {
        const base = '/data/sighting';
        assert.equal(UtilSafePath.isInside(base, Path.join(base, 'x.jpg')), true);
        assert.equal(UtilSafePath.isInside(base, base), true);
        assert.equal(UtilSafePath.isInside(base, '/data/other/x'), false);
        assert.equal(UtilSafePath.isInside(base, Path.join(base, '..', '..', 'etc', 'passwd')), false);
    });

});