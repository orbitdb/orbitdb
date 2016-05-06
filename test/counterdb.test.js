'use strict';

const assert      = require('assert');
const Promise     = require('bluebird');
const rimraf      = require('rimraf')
const ipfsd       = require('ipfsd-ctl');
const OrbitDB     = require('../src/OrbitDB');
const OrbitServer = require('orbit-server/src/server');

// Mute logging
// require('logplease').setLogLevel('ERROR');

const network = 'QmYPobvobKsyoCKTw476yTui611XABf927KxUPCf4gRLRr'; // network.json
const username  = 'testrunner';
const username2 = 'rennurtset';

const ipfsPath = '/tmp/orbittests';

const startIpfs = () => {
  return new Promise((resolve, reject) => {
    OrbitServer.start();
    ipfsd.disposableApi((err, ipfs) => {
      if(err) reject(err);
      resolve(ipfs);
    });
    // ipfsd.local(ipfsPath, (err, node) => {
    //   if(err) reject(err);
    //   node.startDaemon((err, ipfs) => {
    //     if(err) reject(err);
    //     resolve(ipfs);
    //   });
    // });
  });
};

describe('CounterStore', function() {
  this.timeout(20000);

  let ipfs, client1, client2;

  before((done) => {
    rimraf.sync('./orbit-db-cache.json')
    startIpfs()
      .then((res) => {
        ipfs = res;
        return Promise.map([username, username2], (login) => {
          return OrbitDB.connect(network, login, '', ipfs, { allowOffline: false, cacheFile: './orbit-db-cache.json' });
        }).then((clients) => {
          client1 = clients[0];
          client2 = clients[1];
          return;
        }).catch((e) => {
          console.log(e.stack);
          assert.equal(e, null);
        });
      })
      .then(() => ipfs.add('./test/network.json'))
      .then((networkFile)=> {
        assert.equal(networkFile[0].Hash, network);
        return;
      })
      .then(done)
  });

  after((done) => {
    if(client1) client1.disconnect();
    if(client2) client2.disconnect();
    rimraf('./orbit-db-cache.json', done)
  });

  describe('counters', function() {
    it('increases a counter value', (done) => {
      client1.counter('counter test', { subscribe: false, cacheFile: './orbit-db-cache.json' }).then((counter) => {
        Promise.map([13, 1], (f) => counter.inc(f), { concurrency: 1 }).then(() => {
          assert.equal(counter.value(), 14);
          done();
        }).catch((e) => {
          console.error(e.stack);
          assert.equal(null, e);
          done();
        });
      }).catch((e) => {
        console.error(e.stack);
        assert.equal(' ', e.message);
        done();
      });
    });

    it('creates a new counter from cached data', function(done) {
      client1.counter('counter test', { subscribe: false, cacheFile: './orbit-db-cache.json' }).then((counter) => {
        assert.equal(counter.value(), 14);
        done();
      }).catch((e) => {
        console.error(e.stack);
        assert.equal(' ', e.message);
        done();
      });
    });

    it('syncs counters', (done) => {
      const name = new Date().getTime();
      Promise.all([client1.counter(name), client2.counter(name)]).then((counters) => {
        const res1 = Promise.map([13, 10], (f) => counters[0].inc(f), { concurrency: 1 });
        const res2 = Promise.map([2, 5], (f) => counters[1].inc(f), { concurrency: 1 })
        Promise.all([res1, res2]).then((res) => {
          setTimeout(() => {
            assert.equal(counters[0].value(), 30);
            assert.equal(counters[1].value(), 30);
            done();
          }, 1000)
        }).catch((e) => {
          console.log(e);
          assert(e);
          done();
        });
      }).catch((e) => {
        console.log(e);
        assert(e);
        done();
      });
    });

  });

});
