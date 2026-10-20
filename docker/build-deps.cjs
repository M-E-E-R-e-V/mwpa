#!/usr/bin/env node
/**
 * Build-time helper (Docker only). Emits a FLAT package.json (no workspaces)
 * for installing the backend's production dependency tree, because:
 *
 *  1. The git deps (figtree, vts, …) are source packages npm would rebuild
 *     from source on install — pulling in each one's full dev toolchain
 *     (figtree alone drags in vitest + playwright + puppeteer + canvas …),
 *     which never finishes in a container. Rewriting them to plain codeload
 *     tarball URLs skips that prepare/build and uses the committed dist/.
 *  2. A *workspace* install of the same tarball+peer graph crashes npm's
 *     arborist (`Cannot read properties of null (reading 'edgesOut')`); a flat
 *     install is stable. mwpa_schemas (the local schemas workspace) is dropped
 *     here and placed into node_modules separately by the Dockerfile.
 *
 * Writes ./package.json. Branch git specs are pinned to the current remote
 * HEAD. Never run in a dev checkout — this is for the Docker build context.
 */
'use strict';

const fs = require('node:fs');
const {execSync} = require('node:child_process');

const RE = /^(?:git\+)?https:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?(?:#(.+))?$|^github:([^/#]+)\/([^#]+?)(?:#(.+))?$/u;

const resolveHead = (owner, repo) => {
    const out = execSync(`git ls-remote https://github.com/${owner}/${repo}.git HEAD`, {encoding: 'utf8'});
    const sha = out.split('\t')[0].trim();

    if (!/^[0-9a-f]{40}$/u.test(sha)) {
        throw new Error(`could not resolve HEAD for ${owner}/${repo}: "${out}"`);
    }

    return sha;
};

const toTarball = (spec) => {
    const m = RE.exec(String(spec).trim());

    if (!m) {
        return spec;
    }

    const owner = m[1] ?? m[4];
    const repo = m[2] ?? m[5];
    const ref = m[3] ?? m[6] ?? resolveHead(owner, repo);

    return `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
};

const backend = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
const deps = {...backend.dependencies};

// mwpa_schemas is the local workspace — placed into node_modules by hand.
delete deps['mwpa_schemas'];

// figtree declares its runtime peers as git+ URLs; the ones MWPA does not
// co-declare (ets) must be pinned to a tarball too, or npm rebuilds them.
deps['ets'] = 'git+https://github.com/OpenSourcePKG/ets.git';

// Rewrite every github spec to a codeload tarball, and remember which ones
// actually changed — those are the shared source libs that appear again
// *transitively* (e.g. figtree-schemas depends on vts as a plain `git+` spec).
const overrides = {};

for (const name of Object.keys(deps)) {
    const tarball = toTarball(deps[name]);

    if (tarball !== deps[name]) {
        // Same tarball URL for the top-level dep AND every nested occurrence,
        // so npm collapses them to ONE physical copy. Without this, a nested
        // `git+` spec (figtree-schemas → vts) can't dedupe against the top-level
        // tarball spec → a 2nd vts is installed → vts' ObjectSchema exists as two
        // distinct classes → figtree's `config._schema instanceof ObjectSchema`
        // fails with "Config schema is not set!" at boot. (regression guard)
        overrides[name] = tarball;
    }

    deps[name] = tarball;
}

const out = {
    name: 'mwpa-runtime',
    version: backend.version ?? '0.0.0',
    private: true,
    dependencies: deps,
    overrides
};

fs.writeFileSync('package.json', `${JSON.stringify(out, null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`flat build package.json: ${Object.keys(deps).length} deps`);
