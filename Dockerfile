# ---------------------------------------------------------------------------
# Builder — full bullseye (native deps like bcrypt compile/prebuild here).
# ---------------------------------------------------------------------------
FROM node:18-bullseye AS builder

WORKDIR /build

COPY backend/package.json ./backend/package.json
COPY schemas/ ./schemas/
COPY docker/build-deps.cjs ./docker/

# Generate a FLAT production package.json and install the backend's runtime
# tree. Two reasons this isn't a plain `npm install --workspaces`:
#  1. The git deps (figtree, vts, …) are source packages npm would REBUILD
#     from source on install — pacote runs a nested install + prepare that
#     drags in each one's full dev toolchain (figtree alone pulls vitest +
#     @vitest/browser + playwright + puppeteer + canvas …) and never finishes
#     in a container. build-deps rewrites them to plain codeload tarball URLs
#     so the committed dist/ is used as-is.
#  2. A *workspace* install of that tarball+peer graph crashes npm's arborist
#     (`Cannot read properties of null (reading 'edgesOut')`); a flat install
#     is stable. mwpa_schemas (the local schemas workspace) is copied into
#     node_modules by hand afterwards.
# --force accepts the git-spec-vs-tarball peer mismatch (figtree still
# declares its peers as git+ URLs) while auto-installing every regular peer.
# (needs git + network for the tarball refs → build with --network=host.)
RUN node docker/build-deps.cjs

ARG NPM_REGISTRY=https://registry.npmjs.org
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    GIT_TERMINAL_PROMPT=0

RUN npm install --omit=dev --include=peer --force --no-audit --no-fund \
    && cp -r schemas node_modules/mwpa_schemas

# ---------------------------------------------------------------------------
# Runtime — slim bullseye. Only the resolved node_modules + the backend dist
# + the pre-built frontend static assets. Same Debian/glibc as the builder,
# so bcrypt's compiled binary from the builder runs as-is.
# ---------------------------------------------------------------------------
FROM node:18-bullseye-slim AS runtime

WORKDIR /opt/app

# Flat production dependency tree (incl. mwpa_schemas placed by the builder).
COPY --from=builder /build/node_modules ./node_modules

# Backend artefacts at /opt/app root (matches the historical layout).
COPY backend/dist/ ./dist/
COPY backend/package.json ./package.json

# Frontend static assets (pre-built on the host via `npm run compile`).
# .dockerignore keeps node_modules / src build-cruft out of the context.
COPY frontend/ ./frontend

EXPOSE 3000

# Env-first boot (like kavula): no --config, so a config.json is OPTIONAL.
#  * --envargs=1 turns on figtree's env-override pass → MWPAConfig._loadEnv builds
#    the whole config from MWPA_* env vars (DB, httpserver, datadir, proxy.trust).
#  * With no --config, figtree auto-picks a config.json in the workdir IF present,
#    otherwise boots env-only. To force a config file, override the compose
#    `command:` with an extra --config=/opt/app/config.json.
# (Dropping --config is the fix for "Config not found … exit" when nothing is mounted.)
CMD [ "node", "dist/main.js", "--envargs=1"]
