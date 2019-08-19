FROM node:10

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

WORKDIR /home/node

COPY package.json ./
COPY examples/ ./examples
COPY src/ ./src
COPY conf/ ./conf

RUN chown -R node:node package.json examples src conf
USER node

RUN npm install babel-cli webpack \
 && npm install
