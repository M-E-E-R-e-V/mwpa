import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {Tile} from '../src/Routes/Map/Tile/Tile.js';

/**
 * Guards the tile proxy against caching the "Access blocked" image that
 * tile.openstreetmap.org returns (HTTP 200) to clients without User-Agent.
 */
describe('Map Tile', () => {

    it('sends an identifying User-Agent', () => {
        assert.match(Tile.USER_AGENT, /^MWPA .+\(https?:\/\/.+\)$/u);
    });

    it('recognises only the blocked image', () => {
        assert.equal(Tile.isBlockedTile(Buffer.from('not a blocked tile')), false);
        assert.equal(Tile.BLOCKED_TILE_MD5.size > 0, true);
    });

});