FROM node:18-bullseye

RUN mkdir -p /opt/app

RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app

COPY backend/dist/ ./dist
COPY backend/node_modules/ ./node_modules
COPY frontend/ ./frontend

COPY backend/package.json ./package.json

WORKDIR /opt/app/frontend

RUN npm install --force
RUN npm run gulp-clone-bambooo
RUN npm run gulp-copy-data
RUN npm run gulp-build-webpack

WORKDIR /opt/app

EXPOSE 3000

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]
