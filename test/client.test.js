'use strict';

const _       = require('lodash');
const fs      = require('fs');
const path    = require('path');
const assert  = require('assert');
const async   = require('asyncawait/async');
const await   = require('asyncawait/await');
const ipfsd   = require('ipfsd-ctl');
const IPFS    = require('ipfs')
const OrbitDB = require('../src/OrbitDB');
const OrbitServer = require('orbit-server/src/server');

// Mute logging
require('logplease').setLogLevel('ERROR');

// Orbit
const network = 'Qmeh6ktQ1YFKksugJb59vBxG51xXoEvjBZXRK3DdrF3mNj';
const username = 'testrunner';
const password = '';

let ipfs, ipfsDaemon;
const IpfsApis = [
// {
//   // js-ipfs
//   start: () => {
//     return new Promise((resolve, reject) => {
//       const IPFS = require('ipfs')
//       const ipfs = new IPFS();
//       ipfs.goOnline((err) => {
//         if(err) reject(err)
//         else resolve(ipfs)
//       });
//     });
//   },
//   stop: () => new Promise((resolve, reject) => ipfs.goOffline(resolve))
// },
{
  // js-ipfs-api via local daemon
  start: () => {
    return new Promise((resolve, reject) => {
      ipfsd.disposableApi((err, ipfs) => {
        if(err) console.error(err);
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

OrbitServer.start();

IpfsApis.forEach(function(ipfsApi) {

  describe('Orbit Client', function() {
    this.timeout(40000);

    let client, client2, db;
    let channel = 'abcdefghijklmn';
    const cacheFile = path.join(process.cwd(), '/test', 'orbit-db-test-cache.json');

    before(async(function (done) {
      this.timeout(20000);

      try {
        ipfs = await(ipfsApi.start());
        // const str = fs.readFileSync('./test/network.json', 'utf-8');
        // const networkData = new Buffer(JSON.stringify({ Data: str }));
        // const networkFile = await(ipfs.add(path.resolve(process.cwd(), './test/network.json')));
        // assert.equal(networkFile[0].Hash, network);
        client = await(OrbitDB.connect(network, username, password, ipfs, { allowOffline: true }));
        client2 = await(OrbitDB.connect(network, username + "2", password, ipfs, { allowOffline: true }));
      } catch(e) {
        console.log(e.stack);
        assert.equal(e, null);
      }

      done();
    }));

    after(async((done) => {
      if(db) db.delete();
      if(client) client.disconnect();
      await(ipfsApi.stop());
      done();
    }));

  /*
    describe('API', function() {
      let api;

      const getFunctionParams = (f) => {
        let res = f.toString().split('=>')[0].replace('(', '').replace(')', '').replace(' ', '').split(',');
        res = res.map((f) => f.trim());
        if(res[0] === '') res = [];
        return res;
      };

      beforeEach(async((done) => {
        api = await(client.channel('api'));
        done();
      }));

      it('returns an \'iterator\' function', async((done) => {
        assert.equal(typeof api.iterator === 'function', true);
        const params = getFunctionParams(api.iterator);
        assert.equal(params.length, 1);
        assert.equal(params[0], 'options');
        done();
      }));

      it('returns a \'delete\' function', async((done) => {
        assert.equal(typeof api.delete === 'function', true);
        const params = getFunctionParams(api.delete);
        assert.equal(params.length, 0);
        done();
      }));

      it('returns a \'del\' function', async((done) => {
        assert.equal(typeof api.del === 'function', true);
        const params = getFunctionParams(api.del);
        assert.equal(params.length, 1);
        assert.equal(params[0], 'key');
        done();
      }));

      it('returns a \'add\' function', async((done) => {
        assert.equal(typeof api.add === 'function', true);
        const params = getFunctionParams(api.add);
        assert.equal(params.length, 1);
        assert.equal(params[0], 'data');
        done();
      }));

      it('returns a \'put\' function', async((done) => {
        assert.equal(typeof api.put === 'function', true);
        const params = getFunctionParams(api.put);
        assert.equal(params.length, 2);
        assert.equal(params[0], 'key');
        assert.equal(params[1], 'value');
        done();
      }));

      it('returns a \'get\' function', async((done) => {
        assert.equal(typeof api.get === 'function', true);
        const params = getFunctionParams(api.get);
        assert.equal(params.length, 1);
        assert.equal(params[0], 'key');
        done();
      }));

      it('returns a \'close\' function', async((done) => {
        assert.equal(typeof api.close === 'function', true);
        const params = getFunctionParams(api.close);
        assert.equal(params.length, 0);
        done();
      }));
    });
  */

    describe('Add events', function() {
      beforeEach(async((done) => {
        db = await(client.eventlog(channel, { subscribe: false }));
        db.delete();
        done();
      }));

      it('adds an item to an empty channel', async((done) => {
        const head = await(db.add('hello'));
        assert.notEqual(head, null);
        assert.equal(head.startsWith('Qm'), true);
        assert.equal(head.length, 46);
        done();
      }));

      it('adds a new item to a channel with one item', async((done) => {
        const head = db.iterator().collect();
        const second = await(db.add('hello'));
        assert.notEqual(second, null);
        assert.notEqual(second, head);
        assert.equal(second.startsWith('Qm'), true);
        assert.equal(second.length, 46);
        done();
      }));

      it('adds five items', async((done) => {
        for(let i = 1; i <= 5; i ++)
          await(db.add('hello' + i));

        const items = db.iterator({ limit: -1 }).collect();
        assert.equal(items.length, 5);
        assert.equal(_.first(items.map((f) => f.payload.value)), 'hello1');
        assert.equal(_.last(items.map((f) => f.payload.value)), 'hello5');
        done();
      }));

      it('adds an item that is > 256 bytes', async((done) => {
        let msg = new Buffer(1024);
        msg.fill('a')
        const hash = await(db.add(msg.toString()));
        assert.notEqual(hash, null);
        assert.equal(hash.startsWith('Qm'), true);
        assert.equal(hash.length, 46);
        done();
      }));
    });

    describe('Delete events (Feed)', function() {
      beforeEach(async(() => {
        db = await(client.feed(channel, { subscribe: false }));
        db.delete();
      }));

      it('deletes an item when only one item in the database', async((done) => {
        const head = await(db.add('hello1'));
        const delop = await(db.remove(head));
        const items = db.iterator().collect();
        assert.equal(delop.startsWith('Qm'), true);
        assert.equal(items.length, 0);
        done();
      }));

      it('deletes an item when two items in the database', async((done) => {
        await(db.add('hello1'));
        const head = await(db.add('hello2'));
        await(db.remove(head));
        const items = db.iterator({ limit: -1 }).collect();
        assert.equal(items.length, 1);
        assert.equal(items[0].payload.value, 'hello1');
        done();
      }));

      it('deletes an item between adds', async((done) => {
        const head = await(db.add('hello1'));
        await(db.add('hello2'));
        db.remove(head);
        await(db.add('hello3'));
        const items = db.iterator().collect();
        assert.equal(items.length, 1);
        assert.equal(items[0].hash.startsWith('Qm'), true);
        assert.equal(items[0].payload.key, null);
        assert.equal(items[0].payload.value, 'hello3');
        done();
      }));
    });

    describe('Iterator', function() {
      let items = [];
      const itemCount = 5;

      beforeEach(async((done) => {
        items = [];
        db = await(client.eventlog(channel, { subscribe: false }));
        db.delete();
        for(let i = 0; i < itemCount; i ++) {
          const hash = await(db.add('hello' + i));
          items.push(hash);
        }
        done();
      }));

      describe('Defaults', function() {
        it('returns an iterator', async((done) => {
          const iter = db.iterator();
          const next = iter.next().value;
          assert.notEqual(iter, null);
          assert.notEqual(next, null);
          done();
        }));

        it('returns an item with the correct structure', async((done) => {
          const iter = db.iterator();
          const next = iter.next().value;
          assert.notEqual(next, null);
          assert.equal(next.hash.startsWith('Qm'), true);
          assert.equal(next.payload.key, null);
          assert.equal(next.payload.value, 'hello4');
          assert.notEqual(next.payload.meta.ts, null);
          done();
        }));

        it('implements Iterator interface', async((done) => {
          const iter = db.iterator({ limit: -1 });
          let messages = [];

          for(let i of iter)
            messages.push(i.key);

          assert.equal(messages.length, items.length);
          done();
        }));

        it('returns 1 item as default', async((done) => {
          const iter = db.iterator();
          const first = iter.next().value;
          const second = iter.next().value;
          assert.equal(first.hash, items[items.length - 1]);
          assert.equal(second, null);
          assert.equal(first.payload.value, 'hello4');
          done();
        }));
      });

      describe('Collect', function() {
        it('returns all items', async((done) => {
          const messages = db.iterator({ limit: -1 }).collect();
          assert.equal(messages.length, items.length);
          assert.equal(messages[0].payload.value, 'hello0');
          assert.equal(messages[messages.length - 1].payload.value, 'hello4');
          done();
        }));

        it('returns 1 item', async((done) => {
          const messages = db.iterator().collect();
          assert.equal(messages.length, 1);
          done();
        }));

        it('returns 3 items', async((done) => {
          const messages = db.iterator({ limit: 3 }).collect();
          assert.equal(messages.length, 3);
          done();
        }));
      });

      describe('Options: limit', function() {
        it('returns 1 item when limit is 0', async((done) => {
          const iter = db.iterator({ limit: 1 });
          const first = iter.next().value;
          const second = iter.next().value;
          assert.equal(first.hash, _.last(items));
          assert.equal(second, null);
          done();
        }));

        it('returns 1 item when limit is 1', async((done) => {
          const iter = db.iterator({ limit: 1 });
          const first = iter.next().value;
          const second = iter.next().value;
          assert.equal(first.hash, _.last(items));
          assert.equal(second, null);
          done();
        }));

        it('returns 3 items', async((done) => {
          const iter = db.iterator({ limit: 3 });
          const first = iter.next().value;
          const second = iter.next().value;
          const third = iter.next().value;
          const fourth = iter.next().value;
          assert.equal(first.hash, items[items.length - 3]);
          assert.equal(second.hash, items[items.length - 2]);
          assert.equal(third.hash, items[items.length - 1]);
          assert.equal(fourth, null);
          done();
        }));

        it('returns all items', async((done) => {
          const messages = db.iterator({ limit: -1 })
            .collect()
            .map((e) => e.hash);

          messages.reverse();
          assert.equal(messages.length, items.length);
          assert.equal(messages[0], items[items.length - 1]);
          done();
        }));

        it('returns all items when limit is bigger than -1', async((done) => {
          const messages = db.iterator({ limit: -300 })
            .collect()
            .map((e) => e.hash);

          assert.equal(messages.length, items.length);
          assert.equal(messages[0], items[0]);
          done();
        }));

        it('returns all items when limit is bigger than number of items', async((done) => {
          const messages = db.iterator({ limit: 300 })
            .collect()
            .map((e) => e.hash);

          assert.equal(messages.length, items.length);
          assert.equal(messages[0], items[0]);
          done();
        }));
      });

      describe('Options: reverse', function() {
        it('returns all items reversed', async((done) => {
          const messages = db.iterator({ limit: -1, reverse: true })
            .collect()
            .map((e) => e.hash);

          assert.equal(messages.length, items.length);
          assert.equal(messages[0], items[0]);
          done();
        }));
      });

      describe('Option: ranges', function() {
        describe('gt & gte', function() {
          it('returns 1 item when gte is the head', async((done) => {
            const messages = db.iterator({ gte: _.last(items), limit: -1 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, 1);
            assert.equal(messages[0], _.last(items));
            done();
          }));

          it('returns 0 items when gt is the head', async((done) => {
            const messages = db.iterator({ gt: _.last(items) }).collect();
            assert.equal(messages.length, 0);
            done();
          }));

          it('returns 2 item when gte is defined', async((done) => {
            const gte = items[items.length - 2];
            const messages = db.iterator({ gte: gte, limit: -1 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, 2);
            assert.equal(messages[0], items[items.length - 2]);
            assert.equal(messages[1], items[items.length - 1]);
            done();
          }));

          it('returns all items when gte is the root item', async((done) => {
            const messages = db.iterator({ gte: items[0], limit: -1 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, items.length);
            assert.equal(messages[0], items[0]);
            assert.equal(messages[messages.length - 1], _.last(items));
            done();
          }));

          it('returns items when gt is the root item', async((done) => {
            const messages = db.iterator({ gt: items[0], limit: -1 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, itemCount - 1);
            assert.equal(messages[0], items[1]);
            assert.equal(messages[3], _.last(items));
            done();
          }));

          it('returns items when gt is defined', async((done) => {
            const messages = db.iterator({ limit: -1})
              .collect()
              .map((e) => e.hash);

            const gt = messages[2];

            const messages2 = db.iterator({ gt: gt, limit: 100 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages2.length, 2);
            assert.equal(messages2[0], messages[messages.length - 2]);
            assert.equal(messages2[1], messages[messages.length - 1]);
            done();
          }));
        });

        describe('lt & lte', function() {
          it('returns one item after head when lt is the head', async((done) => {
            const messages = db.iterator({ lt: _.last(items) })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, 1);
            assert.equal(messages[0], items[items.length - 2]);
            done();
          }));

          it('returns all items when lt is head and limit is -1', async((done) => {
            const messages = db.iterator({ lt: _.last(items), limit: -1 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, items.length - 1);
            assert.equal(messages[0], items[0]);
            assert.equal(messages[messages.length - 1], items[items.length - 2]);
            done();
          }));

          it('returns 3 items when lt is head and limit is 3', async((done) => {
            const messages = db.iterator({ lt: _.last(items), limit: 3 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, 3);
            assert.equal(messages[0], items[items.length - 4]);
            assert.equal(messages[2], items[items.length - 2]);
            done();
          }));

          it('returns null when lt is the root item', async((done) => {
            const messages = db.iterator({ lt: items[0] }).collect();
            assert.equal(messages.length, 0);
            done();
          }));

          it('returns one item when lte is the root item', async((done) => {
            const messages = db.iterator({ lte: items[0] })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, 1);
            assert.equal(messages[0], items[0]);
            done();
          }));

          it('returns all items when lte is the head', async((done) => {
            const messages = db.iterator({ lte: _.last(items), limit: -1 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, itemCount);
            assert.equal(messages[0], items[0]);
            assert.equal(messages[4], _.last(items));
            done();
          }));

          it('returns 3 items when lte is the head', async((done) => {
            const messages = db.iterator({ lte: _.last(items), limit: 3 })
              .collect()
              .map((e) => e.hash);

            assert.equal(messages.length, 3);
            assert.equal(messages[0], items[items.length - 3]);
            assert.equal(messages[1], items[items.length - 2]);
            assert.equal(messages[2], _.last(items));
            done();
          }));
        });
      });
    });

    describe('Delete', function() {
      it('deletes a channel from the local database', () => {
        const result = db.delete();
        // assert.equal(result, true);
        const iter = db.iterator();
        assert.equal(iter.next().value, null);
      });
    });

    describe('Key-Value Store', function() {
      beforeEach(async((done) => {
        db = await(client.kvstore(channel, { subscribe: false }));
        db.delete();
        done();
      }));

      afterEach((done) => {
        db.delete();
        client.events.on('closed', (dbname) => {
          client.events.removeAllListeners('closed')
          done()
        });
        db.close();
      });

      it('put', async((done) => {
        await(db.put('key1', 'hello!'));
        const value = db.get('key1');
        assert.equal(value, 'hello!');
        done();
      }));

      it('get', async((done) => {
        await(db.put('key1', 'hello!'));
        const value = db.get('key1');
        assert.equal(value, 'hello!');
        done();
      }));

      it('put updates a value', async((done) => {
        await(db.put('key1', 'hello!'));
        await(db.put('key1', 'hello again'));
        const value = db.get('key1');
        assert.equal(value, 'hello again');
        done();
      }));

      it('put/get - multiple keys', async((done) => {
        await(db.put('key1', 'hello1'));
        await(db.put('key2', 'hello2'));
        await(db.put('key3', 'hello3'));
        const v1 = db.get('key1');
        const v2 = db.get('key2');
        const v3 = db.get('key3');
        assert.equal(v1, 'hello1');
        assert.equal(v2, 'hello2');
        assert.equal(v3, 'hello3');
        done();
      }));

      it('deletes a key', async((done) => {
        await(db.put('key1', 'hello!'));
        await(db.del('key1'));
        const value = db.get('key1');
        assert.equal(value, null);
        done();
      }));

      it('deletes a key after multiple updates', async((done) => {
        await(db.put('key1', 'hello1'));
        await(db.put('key1', 'hello2'));
        await(db.put('key1', 'hello3'));
        await(db.del('key1'));
        const value = db.get('key1');
        assert.equal(value, null);
        done();
      }));

      it('get - integer value', async((done) => {
        await(db.put('key1', 123));
        const v1 = db.get('key1');
        assert.equal(v1, 123);
        done();
      }));

      it('get - object value', async((done) => {
        const val = { one: 'first', two: 2 };
        await(db.put('key1', val));
        const v1 = db.get('key1');
        assert.equal(_.isEqual(v1, val), true);
        done();
      }));

      it('get - array value', async((done) => {
        const val = [1, 2, 3, 4, 5];
        await(db.put('key1', val));
        const v1 = db.get('key1');
        assert.equal(_.isEqual(v1, val), true);
        done();
      }));

      it('syncs databases', async((done) => {
        const db2 = await(client2.kvstore(channel, { subscribe: false }));
        db2.delete();
        db2.events.on('data', async((dbname, hash) => {
          await(db.sync(hash))
          const value = db.get('key1');
          assert.equal(value, 'hello2');
          done();
        }));
        await(db.put('key1', 'hello1'));
        await(db2.put('key1', 'hello2'));
      }));
    });
  });

});
