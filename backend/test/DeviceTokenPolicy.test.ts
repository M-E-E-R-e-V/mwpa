import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {DeviceTokenPolicy} from '../src/Application/DeviceTokenPolicy.js';

/**
 * Guards the Quick Connect device token: random 256-bit tokens, only the
 * sha256 hash is stored, bound to the device identity, revocable and
 * expiring 180 days after the last use.
 */
describe('DeviceTokenPolicy', () => {

    const NOW = 1_800_000_000;
    const DEVICE = 'device-abc';
    const valid = {device_identity: DEVICE, last_used_datetime: NOW - 60, revoked_datetime: 0};

    it('generates distinct url-safe tokens with their sha256 hash', () => {
        const a = DeviceTokenPolicy.generate();
        const b = DeviceTokenPolicy.generate();

        assert.notEqual(a.token, b.token);
        assert.match(a.token, /^[A-Za-z0-9_-]{43}$/);
        assert.match(a.hash, /^[0-9a-f]{64}$/);
        assert.equal(a.hash, DeviceTokenPolicy.hash(a.token));
        assert.notEqual(a.hash, a.token);
    });

    it('accepts a used-recently token of the same device', () => {
        assert.equal(DeviceTokenPolicy.check(valid, DEVICE, NOW), 'ok');
    });

    it('refuses unknown, revoked and other-device tokens', () => {
        assert.equal(DeviceTokenPolicy.check(null, DEVICE, NOW), 'unknown');
        assert.equal(DeviceTokenPolicy.check({...valid, revoked_datetime: NOW - 1}, DEVICE, NOW), 'revoked');
        assert.equal(DeviceTokenPolicy.check(valid, 'other-device', NOW), 'device');
    });

    it('expires 180 days after the last use, not after creation', () => {
        const ttl = DeviceTokenPolicy.IDLE_TTL_SEC;
        assert.equal(ttl, 180 * 24 * 60 * 60);

        const lastUse = {...valid, last_used_datetime: NOW - ttl + 1};
        assert.equal(DeviceTokenPolicy.check(lastUse, DEVICE, NOW), 'ok');

        const idle = {...valid, last_used_datetime: NOW - ttl};
        assert.equal(DeviceTokenPolicy.check(idle, DEVICE, NOW), 'expired');
    });

});
