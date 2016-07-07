'use strict';

const assert      = require('assert');
const path        = require('path');
const fs          = require('fs');
const Promise     = require('bluebird');
const rimraf      = require('rimraf')
const OrbitDB     = require('../src/OrbitDB');
const OrbitServer = require('orbit-server/src/server');
const ipfsd       = require('ipfsd-ctl');
const IPFS        = require('ipfs')

// Mute logging
require('logplease').setLogLevel('ERROR');

const network = 'localhost:3333';
const username  = 'testrunner';
const username2 = 'rennurtset';
const ipfsPath  = '/tmp/orbittests';

let ipfs, ipfsDaemon;
const IpfsApis = [
{
  // js-ipfs
  name: 'js-ipfs',
  start: () => {
    return new Promise((resolve, reject) => {
      const IPFS = require('ipfs')
      const ipfs = new IPFS('/tmp/orbit-db-test');
      const init = () => {
        return new Promise((resolve, reject) => {
          ipfs.init({}, (err) => {
            if (err) {
              if (err.message === 'repo already exists') {
                return resolve();
              }
              return reject(err);
            }
            resolve();
          });
        });
      };

      // resolve(ipfs);
      return init().then(() => {
        // resolve(ipfs);
        ipfs.goOnline((err) => {
          if(err) reject(err)
          return resolve(ipfs)
        });
      });
    });
  },
  // stop: () => Promise.resolve()
  stop: () => new Promise((resolve, reject) => ipfs.goOffline(resolve))
},
{
  // js-ipfs-api via local daemon
  name: 'js-ipfs-api',
  start: () => {
    return new Promise((resolve, reject) => {
      ipfsd.disposableApi((err, ipfs) => {
        if(err) reject(err);
        resolve(ipfs);
      });
      // ipfsd.local((err, node) => {
      //   if(err) reject(err);
      //   ipfsDaemon = node;
      //   ipfsDaemon.startDaemon((err, ipfs) => {
      //     if(err) reject(err);
      //     resolve(ipfs);
      //   });
      // });
    });
  },
  stop: () => Promise.resolve()
  // stop: () => new Promise((resolve, reject) => ipfsDaemon.stopDaemon(resolve))
}
];

// OrbitServer.start(); // uncomment if running this test suite stand-alone
IpfsApis.forEach(function(ipfsApi) {

  describe('CounterStore with ' + ipfsApi.name, function() {
    this.timeout(40000);
    let client1, client2;

    before((done) => {
      rimraf.sync('./orbit-db-cache.json')
      ipfsApi.start()
        // .then((ipfs) => {
        //   return ipfs.add(path.resolve(process.cwd(), './test/network.json')).then(() => ipfs)
        // })
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
        .then(done)
    });

    after((done) => {
      if(client1) client1.disconnect();
      if(client2) client2.disconnect();
      ipfsApi.stop().then(() => {
        rimraf('./orbit-db-cache.json', done)
      });
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
        Promise.map([client1, client2], (client) => client.counter(name), { concurrency: 1})
          .then((counters) => {
            const res1 = Promise.map([13, 10], (f) => counters[0].inc(f), { concurrency: 1 });
            const res2 = Promise.map([2, 5], (f) => counters[1].inc(f), { concurrency: 1 })
            Promise.all([res1, res2])
              .then((res) => {
                setTimeout(() => {
                  assert.equal(counters[0].value(), 30);
                  assert.equal(counters[1].value(), 30);
                  done();
                }, 5000)
              })
              .catch((e) => {
                console.log(e);
                console.log(e.stack);
                assert(e);
                done();
              });
          })
          .catch((e) => {
            console.log(e);
            console.log(e.stack);
            assert(e);
            done();
          });
      });

    });
  });

});
