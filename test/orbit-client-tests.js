'use strict';

const _           = require('lodash');
const assert      = require('assert');
const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/Client');

// Orbit
const host     = 'localhost';
const port     = 3333;
const username = 'testrunner';
const password = '';

describe('Orbit Client', function() {
  this.timeout(15000);

  let client, db;
  let items = [];

  let channel = 'abcdefgh';

  before(async((done) => {
    client = await(OrbitClient.connect(host, port, username, password, null, { allowOffline: true }));
    db = client.channel(channel, '', false);
    db.delete();
    done();
  }));

  after(async((done) => {
    if(db) db.delete();
    if(client) client.disconnect();
    done();
  }));

  describe('Add events', function() {
    let items2 = [];
    const itemCount = 5;

    beforeEach(async((done) => {
      db.delete();
      done();
    }));

    after(async((done) => {
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
      for(let i = 0; i < 5; i ++) {
        let hash = await(db.add('hello'));
        assert.notEqual(hash, null);
        assert.equal(hash.startsWith('Qm'), true);
        assert.equal(hash.length, 46);
      }
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

  describe('Delete events', function() {
    beforeEach(async((done) => {
      db.delete();
      let items = db.iterator().collect();
      assert.equal(items.length, 0);
      done();
    }));

    after(async((done) => {
      db.delete();
      done();
    }));

    it('deletes an item when only one item in the database', async((done) => {
      const head = await(db.add('hello1'));
      let item = db.iterator().collect();
      const delop = await(db.del(head));
      const items = db.iterator().collect();
      assert.equal(delop.startsWith('Qm'), true);
      assert.equal(items.length, 0);
      done();
    }));

    it('deletes an item when two items in the database', async((done) => {
      db.delete();
      await(db.add('hello1'));
      const head = await(db.add('hello2'));
      await(db.del(head));
      const items = db.iterator().collect();
      assert.equal(items.length, 1);
      // assert.equal(items[0].op, 'ADD');
      assert.equal(items[0].value, 'hello1');
      done();
    }));

    it('deletes an item between adds', async((done) => {
      const head = await(db.add('hello1'));
      await(db.add('hello2'));
      db.del(head);
      await(db.add('hello3'));
      const items = db.iterator().collect();
      assert.equal(items.length, 1);
      assert.equal(items[0].key.startsWith('Qm'), true);
      assert.equal(items[0].hash.startsWith('Qm'), true);
      // assert.equal(items[0].op, 'ADD');
      assert.equal(items[0].value, 'hello3');
      done();
    }));
  });

  describe('Iterator', function() {
    let items = [];
    let items2 = [];
    const itemCount = 5;

    beforeEach(async((done) => {
      db.delete();
      items2 = [];
      for(let i = 0; i < itemCount; i ++) {
        const hash = await(db.add('hello' + i));
        items2.push(hash);
      }
      done();
    }));

    afterEach(async((done) => {
      db.delete();
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
        assert.notEqual(next.key, null);
        // assert.equal(next.op, 'ADD');
        assert.equal(next.key.startsWith('Qm'), true);
        assert.equal(next.hash.startsWith('Qm'), true);
        assert.equal(next.value, 'hello4');
        done();
      }));

      it('implements Iterator interface', async((done) => {
        const iter = db.iterator({ limit: -1 });
        let messages = [];

        for(let i of iter)
          messages.push(i.key);

        assert.equal(messages.length, items2.length);
        done();
      }));

      it('returns 1 item as default', async((done) => {
        const iter = db.iterator();
        const first = iter.next().value;
        const second = iter.next().value;
        assert.equal(first.key, items2[items2.length - 1]);
        assert.equal(second, null);
        assert.equal(first.value, 'hello4');
        done();
      }));
    });

    describe('Collect', function() {
      let items2;
      before(async((done) => {
        db.delete();
        items2 = [];
        for(let i = 0; i < itemCount; i ++) {
          const hash = await(db.add('hello' + i));
          items2.push(hash);
        }
        done();
      }));

      // after(async((done) => {
      //     db.delete();
      //     items2 = [];
      //     done();
      // }));

      it('returns all items', async((done) => {
        const messages = db.iterator({ limit: -1 }).collect();
        assert.equal(messages.length, items2.length);
        assert.equal(messages[0].value, 'hello0');
        assert.equal(messages[messages.length - 1].value, 'hello4');
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
      let items2;
      beforeEach(async((done) => {
        db.delete();
        items2 = [];
        for(let i = 1; i <= itemCount; i ++) {
          const hash = await(db.add('hello' + i));
          items2.push(hash);
        }
        done();
      }));

      // after(async((done) => {
      //     db.delete();
      //     items2 = [];
      //     done();
      // }));

      it('returns 1 item when limit is 0', async((done) => {
        const iter = db.iterator({ limit: 1 });
        const first = iter.next().value;
        const second = iter.next().value;
        assert.equal(first.key, _.last(items2));
        assert.equal(second, null);
        done();
      }));

      it('returns 1 item when limit is 1', async((done) => {
        const iter = db.iterator({ limit: 1 });
        const first = iter.next().value;
        const second = iter.next().value;
        assert.equal(first.key, _.last(items2));
        assert.equal(second, null);
        done();
      }));

      it('returns 3 items', async((done) => {
        const iter = db.iterator({ limit: 3 });
        const first = iter.next().value;
        const second = iter.next().value;
        const third = iter.next().value;
        const fourth = iter.next().value;
        assert.equal(first.key, items2[items2.length - 3]);
        assert.equal(second.key, items2[items2.length - 2]);
        assert.equal(third.key, items2[items2.length - 1]);
        assert.equal(fourth, null);
        done();
      }));

      it('returns all items', async((done) => {
        const messages = db.iterator({ limit: -1 })
          .collect()
          .map((e) => e.key);

        messages.reverse();
        assert.equal(messages.length, items2.length);
        assert.equal(messages[0], items2[items2.length - 1]);
        done();
      }));

      it('returns all items when limit is bigger than -1', async((done) => {
        const messages = db.iterator({ limit: -300 })
          .collect()
          .map((e) => e.key);

        assert.equal(messages.length, items2.length);
        assert.equal(messages[0], items2[0]);
        done();
      }));

      it('returns all items when limit is bigger than number of items', async((done) => {
        const messages = db.iterator({ limit: 300 })
          .collect()
          .map((e) => e.key);

        assert.equal(messages.length, items2.length);
        assert.equal(messages[0], items2[0]);
        done();
      }));
    });

    describe('Options: reverse', function() {
      let items2;
      beforeEach(async((done) => {
        db.delete();
        items2 = [];
        for(let i = 1; i <= itemCount; i ++) {
          const hash = await(db.add('hello' + i));
          items2.push(hash);
        }
        done();
      }));

      it('returns all items reversed', async((done) => {
        const messages = db.iterator({ limit: -1, reverse: true })
          .collect()
          .map((e) => e.key);

        assert.equal(messages.length, items2.length);
        assert.equal(messages[0], items2[0]);
        done();
      }));
    });

    describe('Options: ranges', function() {
      let items2;
      beforeEach(async((done) => {
        db.delete();
        items2 = [];
        for(let i = 1; i <= itemCount; i ++) {
          const hash = await(db.add('hello' + i));
          items2.push(hash);
        }
        done();
      }));

      describe('gt & gte', function() {
        it('returns 1 item when gte is the head', async((done) => {
          const messages = db.iterator({ gte: _.last(items2), limit: -1 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, 1);
          assert.equal(messages[0], _.last(items2));
          done();
        }));

        it('returns 0 items when gt is the head', async((done) => {
          const messages = db.iterator({ gt: _.last(items2) }).collect();
          assert.equal(messages.length, 0);
          done();
        }));

        it('returns 2 item when gte is defined', async((done) => {
          const gte = items2[items2.length - 2];
          const messages = db.iterator({ gte: gte, limit: -1 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, 2);
          assert.equal(messages[0], items2[items2.length - 2]);
          assert.equal(messages[1], items2[items2.length - 1]);
          done();
        }));

        it('returns all items when gte is the root item', async((done) => {
          const messages = db.iterator({ gte: items2[0], limit: -1 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, items2.length);
          assert.equal(messages[0], items2[0]);
          assert.equal(messages[messages.length - 1], _.last(items2));
          done();
        }));

        it('returns items when gt is the root item', async((done) => {
          const messages = db.iterator({ gt: items2[0], limit: -1 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, itemCount - 1);
          assert.equal(messages[0], items2[1]);
          assert.equal(messages[3], _.last(items2));
          done();
        }));

        it('returns items when gt is defined', async((done) => {
          const messages = db.iterator({ limit: -1})
            .collect()
            .map((e) => e.key);

          const gt = messages[2];

          const messages2 = db.iterator({ gt: gt, limit: 100 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages2.length, 2);
          assert.equal(messages2[0], messages[messages.length - 2]);
          assert.equal(messages2[1], messages[messages.length - 1]);
          done();
        }));
      });

      describe('lt & lte', function() {
        it('returns one item after head when lt is the head', async((done) => {
          const messages = db.iterator({ lt: _.last(items2) })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, 1);
          assert.equal(messages[0], items2[items2.length - 2]);
          done();
        }));

        it('returns all items when lt is head and limit is -1', async((done) => {
          const messages = db.iterator({ lt: _.last(items2), limit: -1 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, items2.length - 1);
          assert.equal(messages[0], items2[0]);
          assert.equal(messages[messages.length - 1], items2[items2.length - 2]);
          done();
        }));

        it('returns 3 items when lt is head and limit is 3', async((done) => {
          const messages = db.iterator({ lt: _.last(items2), limit: 3 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, 3);
          assert.equal(messages[0], items2[items2.length - 4]);
          assert.equal(messages[2], items2[items2.length - 2]);
          done();
        }));

        it('returns null when lt is the root item', async((done) => {
          const messages = db.iterator({ lt: items2[0] }).collect();
          assert.equal(messages.length, 0);
          done();
        }));

        it('returns one item when lte is the root item', async((done) => {
          const messages = db.iterator({ lte: items2[0] })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, 1);
          assert.equal(messages[0], items2[0]);
          done();
        }));

        it('returns all items when lte is the head', async((done) => {
          const messages = db.iterator({ lte: _.last(items2), limit: -1 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, itemCount);
          assert.equal(messages[0], items2[0]);
          assert.equal(messages[4], _.last(items2));
          done();
        }));

        it('returns 3 items when lte is the head', async((done) => {
          const messages = db.iterator({ lte: _.last(items2), limit: 3 })
            .collect()
            .map((e) => e.key);

          assert.equal(messages.length, 3);
          assert.equal(messages[0], items2[items2.length - 3]);
          assert.equal(messages[1], items2[items2.length - 2]);
          assert.equal(messages[2], _.last(items2));
          done();
        }));
      });
    });
  });


  describe('Delete', function() {
    it('deletes a channel from the database', async((done) => {
      const result = db.delete();
      assert.equal(result, true);
      const iter = db.iterator();
      assert.equal(iter.next().value, null);
      done();
    }));
  });

  describe('Key-Value Store', function() {
    before(async((done) => {
      db.delete();
      done();
    }));

    it('put', async((done) => {
      await(db.put('key1', 'hello!'));
      let all = db.iterator().collect();
      assert.equal(all.length, 1);
      assert.equal(all[0].hash.startsWith('Qm'), true);
      assert.equal(all[0].key, 'key1');
      // assert.equal(all[0].op, 'PUT');
      assert.notEqual(all[0].meta, null);
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

    it('put - multiple keys', async((done) => {
      await(db.put('key1', 'hello1'));
      await(db.put('key2', 'hello2'));
      await(db.put('key3', 'hello3'));
      const all = db.iterator().collect();
      assert.equal(all.length, 1);
      done();
    }));

    it('get - multiple keys', async((done) => {
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
  });
});
