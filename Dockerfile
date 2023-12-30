FROM node:20
WORKDIR /pathology_app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEW_RELIC_LOG_ENABLED=false
ENV NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES="404,401"
ARG NEW_RELIC_LICENSE_KEY=dummy
ARG NEW_RELIC_APP_NAME=dummy
# avoid using the db when building pages
ARG OFFLINE_BUILD=true

RUN npm config set fund false

WORKDIR /pathology_app

# ts-node / tspath is needed for other scripts right now. module-alias is used for socket server production
# ideally all would use package module alias and we would not need ts-node / tspath. but that's a TODO
RUN npm install -g ts-node typescript module-alias

COPY --chown=node:node package*.json ./

RUN npm install --platform=linux --arch=x64 sharp
RUN npm install --platform=linuxmusl
#RUN chown -R node:node node_modules/

COPY --chown=node:node . .

# for web app
RUN npm run build --omit=dev
#RUN chown -R node:node .next/

# for socket server
RUN tsc -p tsconfig-socket.json

#USER node

CMD ["npm","start"]