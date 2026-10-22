import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {ACLRbac} from '../src/ACL/ACLRbac.js';

/**
 * Guards the ACL enforcement contract. figtree's base `ACLRbac.checkAccess`
 * drops the user-right list and asks rbac-simple, which only knows the two
 * seeded roles (root/user) via ASSOCIATIONS. The MWPA override must honor the
 * session's explicit (UI-assigned, parent-expanded) rights on top of that
 * fallback — otherwise the admin rights dialog is decorative and any group
 * mapped to a custom role is locked out of every gated route.
 *
 * Pure unit test (no DB); if a future figtree bump silently reverts the
 * 2-arg delegation this test turns red instead of shipping a broken gate.
 */
describe('ACLRbac.checkAccess', () => {
    const acl = new ACLRbac();

    it('root (ASSOCIATIONS fallback) passes any right', async() => {
        // parent key in ASSOCIATIONS.root implicitly grants its child actions
        assert.equal(await acl.checkAccess('root', 'users_write'), true);
        assert.equal(await acl.checkAccess('root', 'blacklist_write'), true);
        assert.equal(await acl.checkAccess('root', 'users_delete'), true);
    });

    it('user (ASSOCIATIONS fallback) passes its defaults but not admin rights', async() => {
        assert.equal(await acl.checkAccess('user', 'sightings_read'), true);
        assert.equal(await acl.checkAccess('user', 'tours_tracking_edit'), true);
        assert.equal(await acl.checkAccess('user', 'users_write'), false);
        assert.equal(await acl.checkAccess('user', 'vehicles_read'), false);
    });

    it('a custom role is denied everything without explicit rights (fail closed)', async() => {
        assert.equal(await acl.checkAccess('field-lead', 'sightings_read', []), false);
        assert.equal(await acl.checkAccess('field-lead', 'users_write'), false);
    });

    it('explicit UI rights grant access for a custom role, parent-expanded', async() => {
        // 'analytics' is a parent key; it must imply its child 'analytics_read'.
        const rights = ['sightings_read', 'analytics'];
        assert.equal(await acl.checkAccess('field-lead', 'sightings_read', rights), true);
        assert.equal(await acl.checkAccess('field-lead', 'analytics_read', rights), true);
        assert.equal(await acl.checkAccess('field-lead', 'users_write', rights), false);
    });

    it('explicit rights are additive over the role fallback (never revoke)', async() => {
        // user lacks vehicles_read in ASSOCIATIONS; an explicit grant enables it.
        assert.equal(await acl.checkAccess('user', 'vehicles_read', ['vehicles_read']), true);
    });

    it('per-export rights: user has all four via the export parent', async() => {
        const granted = await Promise.all(
            ['export_xlsx', 'export_aroc', 'export_dwca', 'export_r'].map((right) => acl.checkAccess('user', right))
        );
        assert.deepEqual(granted, [true, true, true, true]);
    });

    it('per-export rights: a custom role can be granted exactly one export', async() => {
        const rights = ['export_aroc'];
        assert.equal(await acl.checkAccess('office', 'export_aroc', rights), true);
        assert.equal(await acl.checkAccess('office', 'export_xlsx', rights), false);
        assert.equal(await acl.checkAccess('office', 'export_dwca', rights), false);
        // the whole 'export' parent grants every child
        assert.equal(await acl.checkAccess('office', 'export_dwca', ['export']), true);
    });

    it('expandRights adds the children of any granted area key', () => {
        const out = ACLRbac.expandRights(['sightings', 'ais_read']);
        assert.ok(out.includes('sightings_read'));
        assert.ok(out.includes('sightings_mobile_write'));
        assert.ok(out.includes('ais_read'));
        // a leaf key stays a single entry, no bogus children
        assert.ok(!out.includes('sightings'.concat('_nope')));
    });
});