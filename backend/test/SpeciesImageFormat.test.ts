import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {Image} from '../src/Routes/Main/Species/Image.js';

/**
 * The species image upload only accepts raster formats recognised by their
 * magic bytes (never by the client-sent name/mime), so e.g. an SVG or HTML
 * file renamed to .png is rejected.
 */
describe('Species Image.detectFormat', () => {
    it('detects PNG, JPEG, GIF and WebP', () => {
        assert.deepEqual(Image.detectFormat(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])), {ext: 'png', mime: 'image/png'});
        assert.deepEqual(Image.detectFormat(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])), {ext: 'jpg', mime: 'image/jpeg'});
        assert.deepEqual(Image.detectFormat(Buffer.from('GIF89a......', 'ascii')), {ext: 'gif', mime: 'image/gif'});
        assert.deepEqual(Image.detectFormat(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'latin1')), {ext: 'webp', mime: 'image/webp'});
    });

    it('rejects SVG, HTML, empty and truncated input', () => {
        assert.equal(Image.detectFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
        assert.equal(Image.detectFormat(Buffer.from('<html><script>alert(1)</script>')), null);
        assert.equal(Image.detectFormat(Buffer.alloc(0)), null);
        assert.equal(Image.detectFormat(Buffer.from([0x89, 0x50, 0x4E])), null);
        assert.equal(Image.detectFormat(Buffer.from('RIFF\u0000\u0000\u0000\u0000WAVE', 'latin1')), null);
    });

    it('maps stored extensions to image mime types', () => {
        assert.equal(Image.mimeOf('species-1-1.png'), 'image/png');
        assert.equal(Image.mimeOf('species-1-1.jpg'), 'image/jpeg');
        assert.equal(Image.mimeOf('species-1-1.webp'), 'image/webp');
        assert.equal(Image.mimeOf('species-1-1.svg'), 'application/octet-stream');
    });
});