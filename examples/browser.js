'use strict';

// const IpfsApi = require('ipfs-api');
const IPFS = require('exports?Ipfs!ipfs/dist/index.js')
const Logger  = require('logplease');
const logger  = Logger.create("orbit-db example", { color: Logger.Colors.Green, showTimestamp: false, showLevel: false });
const OrbitDB = require('../src/OrbitDB');

const network  = 'QmYPobvobKsyoCKTw476yTui611XABf927KxUPCf4gRLRr'; // 'localhost:3333'
const username = 'user1';
const password = '';
const channel  = 'browsertest1';
const key      = 'greeting';
const value    = 'Hello world';

try {
  const ipfs = new IPFS();
  OrbitDB.connect(network, username, password, ipfs).then((orbit) => {
    orbit.kvstore(channel).then((db) => {
      let count = 1;
      const query = () => {
        const startTime = new Date().getTime();
        db.put(key, value + " " + count).then((res) => {
          const endTime = new Date().getTime();
          logger.debug(`db.put (#${count}) took ${(endTime - startTime)} ms\n`);
          count ++;

          const result = db.get(key);
          logger.debug("---------------------------------------------------")
          logger.debug("Key | Value")
          logger.debug("---------------------------------------------------")
          logger.debug(`${key} | ${result}`);
          logger.debug("---------------------------------------------------")
          console.log('\n');
        }).catch((e) => logger.error(e));
      };
      setInterval(query, 1000);
    });
  });
} catch(e) {
  logger.error(e.stack);
}
