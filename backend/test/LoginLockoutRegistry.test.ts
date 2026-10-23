import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {LoginLockoutRegistry} from '../src/Application/LoginLockoutRegistry.js';

/**
 * Guards the mobile-login lockout: N failed attempts for an (email, device)
 * pair lock it; success/unlock clear it; the lock is device-scoped and the
 * email is matched case-insensitively. Uses fresh instances (not the singleton)
 * so cases don't bleed into each other.
 */
describe('LoginLockoutRegistry', () => {

    const EMAIL = 'crew@example.org';
    const DEVICE = 'device-abc';

    it('is not locked before any failures', () => {
        const reg = new LoginLockoutRegistry();
        assert.equal(reg.isLocked(EMAIL, DEVICE), false);
    });

    it('locks only once MAX_FAILURES is reached', () => {
        const reg = new LoginLockoutRegistry();

        for (let i = 0; i < LoginLockoutRegistry.MAX_FAILURES - 1; i++) {
            reg.recordFailure(EMAIL, DEVICE, '');
        }
        assert.equal(reg.isLocked(EMAIL, DEVICE), false);

        reg.recordFailure(EMAIL, DEVICE, '');
        assert.equal(reg.isLocked(EMAIL, DEVICE), true);
        assert.ok(reg.lockRemainingMs(EMAIL, DEVICE) > 0);
    });

    it('is device-scoped and email-case-insensitive', () => {
        const reg = new LoginLockoutRegistry();

        for (let i = 0; i < LoginLockoutRegistry.MAX_FAILURES; i++) {
            reg.recordFailure(EMAIL, DEVICE, '');
        }
        // same account, different device -> not locked
        assert.equal(reg.isLocked(EMAIL, 'other-device'), false);
        // same pair, differently-cased email -> locked
        assert.equal(reg.isLocked('CREW@Example.org', DEVICE), true);
    });

    it('reset() clears the lock (success path)', () => {
        const reg = new LoginLockoutRegistry();

        for (let i = 0; i < LoginLockoutRegistry.MAX_FAILURES; i++) {
            reg.recordFailure(EMAIL, DEVICE, '');
        }
        assert.equal(reg.isLocked(EMAIL, DEVICE), true);

        reg.reset(EMAIL, DEVICE);
        assert.equal(reg.isLocked(EMAIL, DEVICE), false);
    });

    it('list() exposes locked entries and unlock(key) lifts them', () => {
        const reg = new LoginLockoutRegistry();

        for (let i = 0; i < LoginLockoutRegistry.MAX_FAILURES; i++) {
            reg.recordFailure(EMAIL, DEVICE, 'agent/1.0');
        }

        const list = reg.list();
        assert.equal(list.length, 1);
        assert.equal(list[0].email, EMAIL);
        assert.ok(list[0].locked_until > 0);

        assert.equal(reg.unlock(list[0].key), true);
        assert.equal(reg.isLocked(EMAIL, DEVICE), false);
        assert.equal(reg.list().length, 0);
    });

});