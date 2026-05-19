FROM node:18-bullseye

# ---- Workspace install (transient build dir) ----
# npm workspaces hoist deps + symlink `mwpa_schemas` into root's
# node_modules. We replicate the dev install here, then move the
# resolved tree into the final /opt/app layout (which keeps the
# original 1.0.33 conventions: dist + node_modules + frontend at root).
WORKDIR /build

COPY package.json package-lock.json* ./
COPY schemas/ ./schemas/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install --workspaces --include-workspace-root --omit=dev --include=peer

# ---- Final runtime layout ----
WORKDIR /opt/app

# Backend artefacts at /opt/app root (matches the historical layout).
COPY backend/dist/ ./dist/
COPY backend/package.json ./package.json

# Move the workspace-installed node_modules in. Dereference the
# mwpa_schemas symlink (which points at /build/schemas) into a real
# directory so the runtime doesn't need /build/ anymore.
RUN cp -aL /build/node_modules ./node_modules \
    && rm -rf /build

# Frontend static assets (pre-built on the host via `npm run compile`).
COPY frontend/ ./frontend

EXPOSE 3000

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]