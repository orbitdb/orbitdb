FROM node:carbon

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

WORKDIR /home/node
USER node

COPY package.json ./
COPY examples/ ./examples
COPY src/ ./src
COPY conf/ ./conf

RUN npm install babel-cli webpack \
 && npm install
