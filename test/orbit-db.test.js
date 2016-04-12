'use strict';

const _          = require('lodash');
const fs         = require('fs');
const path       = require('path');
const assert     = require('assert');
const async      = require('asyncawait/async');
const await      = require('asyncawait/await');
const ipfsDaemon = require('orbit-common/lib/ipfs-daemon');
const OrbitDB    = require('../src/OrbitDB');
const Log        = require('ipfs-log');

// Mute logging
// require('log4js').setGlobalLogLevel('ERROR');

// Orbit
const username = 'testrunner';
const password = '';
const user = { username: username };

describe('OrbitDB', function() {
  this.timeout(2000);

  let db, ipfs;
  let channel = 'orbit-db.test';

  before(async((done) => {
    try {
      const daemon = await(ipfsDaemon());
      ipfs = daemon.ipfs;
    } catch(e) {
      console.log(e);
      assert.equal(e, null);
    }
    done();
  }));

  describe('constructor', function() {
    it('sets defaults', async((done) => {
      db = new OrbitDB(ipfs);
      assert.notEqual(db._ipfs, null);
      assert.notEqual(db._logs, null);
      assert.notEqual(db.options, null);
      assert.equal(db.lastWrite, null);
      assert.equal(db._cached.length, 0);
      done();
    }));

    it('sets options', async((done) => {
      db = new OrbitDB(ipfs, { option1: 'hello', option2: 2 });
      assert.equal(db.options.option1, 'hello');
      assert.equal(db.options.option2, 2);
      done();
    }));
  });

  describe('use', function() {
    beforeEach(() => {
      db = new OrbitDB(ipfs);
    });

    it('sets user', (done) => {
      db.use(channel, user).then(() => {
        assert.equal(db.user.username, username);
        done();
      });
    });

    it('creates an empty log for the channel', (done) => {
      db.use(channel, user).then(() => {
        assert(db._logs[channel]);
        assert.equal(db._logs[channel].id, username);
        assert.equal(db._logs[channel].items.length, 0);
        done();
      });
    });

    it('creates event emitter for the channel', (done) => {
      const EventEmitter = require('events').EventEmitter;
      db.use(channel, user).then(() => {
        assert(db.events[channel]);
        assert.equal(db.events[channel] instanceof EventEmitter, true);
        done();
      });
    });
  });

  describe('sync', function() {
    let log, otherLogHash, otherDbHash;

    beforeEach(async((done) => {
      log = await(Log.create(ipfs, username));
      await(log.add("one"));
      await(log.add("two"));
      await(log.add("three"));
      otherLogHash = await(Log.getIpfsHash(ipfs, log));

      const cacheFile = path.join(process.cwd(), '/test', 'orbit-db-test-cache.json');

      let count = 0;
      const db2 = new OrbitDB(ipfs);
      await(db2.use(channel, user));
      db2.events[channel].on('write', async((channel, hash) => {
        otherDbHash = hash;
        if(count === 2) {
          const obj = Object.defineProperty({}, channel, {
            value: hash,
            writable: true
          });
          fs.writeFileSync(cacheFile, JSON.stringify(obj));

          db = new OrbitDB(ipfs, { cacheFile: cacheFile });
          await(db.use(channel, user));
          done();
        } else {
          count ++;
        }
      }));
      await(db2.add(channel, '', "hello world 1"));
      await(db2.add(channel, '', "hello world 2"));
      await(db2.add(channel, '', "hello world 3"));
    }));

    afterEach(() => {
      db = null;
    });

    describe('events', function() {
      it('emits \'loaded\' event when sync hash is null', async((done) => {
        db.events[channel].on('loaded', (src, channelName) => done());
        db.sync(channel, null);
      }));

      it('emits \'load\' event when sync starts', async((done) => {
        db.events[channel].on('load', (src, channelName) => done());
        db.sync(channel, otherDbHash);
      }));

      it('emits \'loaded\' event when sync finishes', async((done) => {
        db.events[channel].on('loaded', (src, channelName) => done());
        db.sync(channel, otherDbHash);
      }));

      it('emits \'sync\' event if items were merged', async((done) => {
        db.events[channel].on('sync', (channelName, hash) => {
          assert.equal(channelName, channel);
          assert.equal(hash, otherDbHash);
          done();
        });
        db.sync(channel, otherDbHash);
      }));

      it('doesn\'t emit \'sync\' event if items weren\'t merged', async((done) => {
        db._logs[channel] = log;
        db.events[channel].on('sync', (channelName, hash) => {
          assert.equal(false, true);
          done();
        });
        db.events[channel].on('loaded', (src, channelName) => done());
        db.sync(channel, otherLogHash);
      }));
    });

    describe('cache payloads', function() {
      it('fetches payloads', (done) => {
        assert.equal(db._cached.length, 0);
        db.events[channel].on('loaded', (src, channelName) => {
          assert.equal(db._cached.length, 3);
          done();
        });
        db.sync(channel, otherDbHash);
      });

      it('throws an error if fetching went wrong', (done) => {
        db.sync(channel, otherLogHash).catch((e) => {
          assert.equal(e.message, 'invalid ipfs ref path');
          done();
        })
      });
    });

  });
});
