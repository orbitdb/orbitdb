'use strict'

const _        = require('lodash')
const fs       = require('fs')
const path     = require('path')
const assert   = require('assert')
const async    = require('asyncawait/async')
const await    = require('asyncawait/await')
const Promise  = require('bluebird')
const IpfsApis = require('ipfs-test-apis')
const OrbitDB  = require('../src/OrbitDB')

// Orbit
const username = 'testrunner'

let ipfs

IpfsApis.forEach(function(ipfsApi) {

  describe('Orbit Client with ' + ipfsApi.name, function() {
    this.timeout(20000)

    let client, client2, db
    let channel = 'abcdefghijklmn'
    const cacheFile = path.join(process.cwd(), '/test', 'orbit-db-test-cache.json')

    before(function (done) {
      ipfsApi.start()
        .then((res) => {
          ipfs = res
          client = new OrbitDB(ipfs, username)
          client2 = new OrbitDB(ipfs, username + '2')
          done()
        })
        .catch(done)
    })

    after((done) => {
      if(db) db.delete()
      if(client) client.disconnect()
      if(client2) client2.disconnect()
      ipfsApi.stop().then(() => done())
    })

    describe('Add events', function() {
      beforeEach(() => {
        db = client.eventlog(channel, { subscribe: false })
        db.delete()
      })

      it('adds an item to an empty channel', () => {
        return db.add('hello')
          .then((head) => {
            assert.notEqual(head, null)
            assert.equal(head.startsWith('Qm'), true)
            assert.equal(head.length, 46)
          })
      })

      it('adds a new item to a channel with one item', () => {
        const head = db.iterator().collect()
        return db.add('hello')
          .then((second) => {
            assert.notEqual(second, null)
            assert.notEqual(second, head)
            assert.equal(second.startsWith('Qm'), true)
            assert.equal(second.length, 46)
          })
      })

      it('adds five items', async(() => {
        for(let i = 1; i <= 5; i ++)
          await(db.add('hello' + i));
        // const items = [1, 2, 3, 4, 5]
        // return Promise.map(items, (i) => db.add('hello' + i), { concurrency: 1 })
        //   .then((res) => {
            const items = db.iterator({ limit: -1 }).collect()
            assert.equal(items.length, 5)
            assert.equal(_.first(items.map((f) => f.payload.value)), 'hello1')
            assert.equal(_.last(items.map((f) => f.payload.value)), 'hello5')
          // })
      }))

      it('adds an item that is > 256 bytes', () => {
        let msg = new Buffer(1024)
        msg.fill('a')
        return db.add(msg.toString())
          .then((hash) => {
            assert.notEqual(hash, null)
            assert.equal(hash.startsWith('Qm'), true)
            assert.equal(hash.length, 46)
          })
      })
    })

    describe('Delete events (Feed)', function() {
      beforeEach(() => {
        db = client.feed(channel, { subscribe: false })
        db.delete()
      })

      it('deletes an item when only one item in the database', async(() => {
        const head = await(db.add('hello1'))
        const delop = await(db.remove(head))
        const items = db.iterator().collect()
        assert.equal(delop.startsWith('Qm'), true)
        assert.equal(items.length, 0)
      }))

      it('deletes an item when two items in the database', async(() => {
        await(db.add('hello1'))
        const head = await(db.add('hello2'))
        await(db.remove(head))
        const items = db.iterator({ limit: -1 }).collect()
        assert.equal(items.length, 1)
        assert.equal(items[0].payload.value, 'hello1')
      }))

      it('deletes an item between adds', async(() => {
        const head = await(db.add('hello1'))
        await(db.add('hello2'))
        db.remove(head)
        await(db.add('hello3'))
        const items = db.iterator().collect()
        assert.equal(items.length, 1)
        assert.equal(items[0].hash.startsWith('Qm'), true)
        assert.equal(items[0].payload.key, null)
        assert.equal(items[0].payload.value, 'hello3')
      }))
    })

    describe('Iterator', function() {
      let items = []
      const itemCount = 5

      beforeEach(async(() => {
        items = []
        db = client.eventlog(channel, { subscribe: false })
        db.delete()
        for(let i = 0; i < itemCount; i ++) {
          const hash = await(db.add('hello' + i))
          items.push(hash)
        }
      }))

      describe('Defaults', function() {
        it('returns an iterator', async((done) => {
          const iter = db.iterator()
          const next = iter.next().value
          assert.notEqual(iter, null)
          assert.notEqual(next, null)
          done()
        }))

        it('returns an item with the correct structure', async((done) => {
          const iter = db.iterator()
          const next = iter.next().value
          assert.notEqual(next, null)
          assert.equal(next.hash.startsWith('Qm'), true)
          assert.equal(next.payload.key, null)
          assert.equal(next.payload.value, 'hello4')
          assert.notEqual(next.payload.meta.ts, null)
          done()
        }))

        it('implements Iterator interface', async((done) => {
          const iter = db.iterator({ limit: -1 })
          let messages = []

          for(let i of iter)
            messages.push(i.key)

          assert.equal(messages.length, items.length)
          done()
        }))

        it('returns 1 item as default', async((done) => {
          const iter = db.iterator()
          const first = iter.next().value
          const second = iter.next().value
          assert.equal(first.hash, items[items.length - 1])
          assert.equal(second, null)
          assert.equal(first.payload.value, 'hello4')
          done()
        }))

        it('returns items in the correct order', async((done) => {
          const amount = 3
          const iter = db.iterator({ limit: amount })
          let i = items.length - amount
          for(let item of iter) {
            assert.equal(item.payload.value, 'hello' + i)
            i ++
          }
          done()
        }))
      })

      describe('Collect', function() {
        it('returns all items', async((done) => {
          const messages = db.iterator({ limit: -1 }).collect()
          assert.equal(messages.length, items.length)
          assert.equal(messages[0].payload.value, 'hello0')
          assert.equal(messages[messages.length - 1].payload.value, 'hello4')
          done()
        }))

        it('returns 1 item', async((done) => {
          const messages = db.iterator().collect()
          assert.equal(messages.length, 1)
          done()
        }))

        it('returns 3 items', async((done) => {
          const messages = db.iterator({ limit: 3 }).collect()
          assert.equal(messages.length, 3)
          done()
        }))
      })

      describe('Options: limit', function() {
        it('returns 1 item when limit is 0', async((done) => {
          const iter = db.iterator({ limit: 1 })
          const first = iter.next().value
          const second = iter.next().value
          assert.equal(first.hash, _.last(items))
          assert.equal(second, null)
          done()
        }))

        it('returns 1 item when limit is 1', async((done) => {
          const iter = db.iterator({ limit: 1 })
          const first = iter.next().value
          const second = iter.next().value
          assert.equal(first.hash, _.last(items))
          assert.equal(second, null)
          done()
        }))

        it('returns 3 items', async((done) => {
          const iter = db.iterator({ limit: 3 })
          const first = iter.next().value
          const second = iter.next().value
          const third = iter.next().value
          const fourth = iter.next().value
          assert.equal(first.hash, items[items.length - 3])
          assert.equal(second.hash, items[items.length - 2])
          assert.equal(third.hash, items[items.length - 1])
          assert.equal(fourth, null)
          done()
        }))

        it('returns all items', async((done) => {
          const messages = db.iterator({ limit: -1 })
            .collect()
            .map((e) => e.hash)

          messages.reverse()
          assert.equal(messages.length, items.length)
          assert.equal(messages[0], items[items.length - 1])
          done()
        }))

        it('returns all items when limit is bigger than -1', async((done) => {
          const messages = db.iterator({ limit: -300 })
            .collect()
            .map((e) => e.hash)

          assert.equal(messages.length, items.length)
          assert.equal(messages[0], items[0])
          done()
        }))

        it('returns all items when limit is bigger than number of items', async((done) => {
          const messages = db.iterator({ limit: 300 })
            .collect()
            .map((e) => e.hash)

          assert.equal(messages.length, items.length)
          assert.equal(messages[0], items[0])
          done()
        }))
      })

      describe('Option: ranges', function() {
        describe('gt & gte', function() {
          it('returns 1 item when gte is the head', async((done) => {
            const messages = db.iterator({ gte: _.last(items), limit: -1 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, 1)
            assert.equal(messages[0], _.last(items))
            done()
          }))

          it('returns 0 items when gt is the head', async((done) => {
            const messages = db.iterator({ gt: _.last(items) }).collect()
            assert.equal(messages.length, 0)
            done()
          }))

          it('returns 2 item when gte is defined', async((done) => {
            const gte = items[items.length - 2]
            const messages = db.iterator({ gte: gte, limit: -1 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, 2)
            assert.equal(messages[0], items[items.length - 2])
            assert.equal(messages[1], items[items.length - 1])
            done()
          }))

          it('returns all items when gte is the root item', async((done) => {
            const messages = db.iterator({ gte: items[0], limit: -1 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, items.length)
            assert.equal(messages[0], items[0])
            assert.equal(messages[messages.length - 1], _.last(items))
            done()
          }))

          it('returns items when gt is the root item', async((done) => {
            const messages = db.iterator({ gt: items[0], limit: -1 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, itemCount - 1)
            assert.equal(messages[0], items[1])
            assert.equal(messages[3], _.last(items))
            done()
          }))

          it('returns items when gt is defined', async((done) => {
            const messages = db.iterator({ limit: -1})
              .collect()
              .map((e) => e.hash)

            const gt = messages[2]

            const messages2 = db.iterator({ gt: gt, limit: 100 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages2.length, 2)
            assert.equal(messages2[0], messages[messages.length - 2])
            assert.equal(messages2[1], messages[messages.length - 1])
            done()
          }))
        })

        describe('lt & lte', function() {
          it('returns one item after head when lt is the head', async((done) => {
            const messages = db.iterator({ lt: _.last(items) })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, 1)
            assert.equal(messages[0], items[items.length - 2])
            done()
          }))

          it('returns all items when lt is head and limit is -1', async((done) => {
            const messages = db.iterator({ lt: _.last(items), limit: -1 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, items.length - 1)
            assert.equal(messages[0], items[0])
            assert.equal(messages[messages.length - 1], items[items.length - 2])
            done()
          }))

          it('returns 3 items when lt is head and limit is 3', async((done) => {
            const messages = db.iterator({ lt: _.last(items), limit: 3 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, 3)
            assert.equal(messages[0], items[items.length - 4])
            assert.equal(messages[2], items[items.length - 2])
            done()
          }))

          it('returns null when lt is the root item', async((done) => {
            const messages = db.iterator({ lt: items[0] }).collect()
            assert.equal(messages.length, 0)
            done()
          }))

          it('returns one item when lte is the root item', async((done) => {
            const messages = db.iterator({ lte: items[0] })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, 1)
            assert.equal(messages[0], items[0])
            done()
          }))

          it('returns all items when lte is the head', async((done) => {
            const messages = db.iterator({ lte: _.last(items), limit: -1 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, itemCount)
            assert.equal(messages[0], items[0])
            assert.equal(messages[4], _.last(items))
            done()
          }))

          it('returns 3 items when lte is the head', async((done) => {
            const messages = db.iterator({ lte: _.last(items), limit: 3 })
              .collect()
              .map((e) => e.hash)

            assert.equal(messages.length, 3)
            assert.equal(messages[0], items[items.length - 3])
            assert.equal(messages[1], items[items.length - 2])
            assert.equal(messages[2], _.last(items))
            done()
          }))
        })
      })
    })

    describe('Delete', function() {
      it('deletes a channel from the local database', () => {
        const result = db.delete()
        // assert.equal(result, true)
        const iter = db.iterator()
        assert.equal(iter.next().value, null)
      })
    })

    describe('Key-Value Store', function() {
      beforeEach(() => {
        db = client.kvstore(channel, { subscribe: false })
        db.delete()
      })

      afterEach(() => {
        db.close()
      })

      it('put', async(() => {
        await(db.put('key1', 'hello!'))
        const value = db.get('key1')
        assert.equal(value, 'hello!')
      }))

      it('get', async(() => {
        await(db.put('key1', 'hello!'))
        const value = db.get('key1')
        assert.equal(value, 'hello!')
      }))

      it('put updates a value', async(() => {
        await(db.put('key1', 'hello!'))
        await(db.put('key1', 'hello again'))
        const value = db.get('key1')
        assert.equal(value, 'hello again')
      }))

      it('put/get - multiple keys', async(() => {
        await(db.put('key1', 'hello1'))
        await(db.put('key2', 'hello2'))
        await(db.put('key3', 'hello3'))
        const v1 = db.get('key1')
        const v2 = db.get('key2')
        const v3 = db.get('key3')
        assert.equal(v1, 'hello1')
        assert.equal(v2, 'hello2')
        assert.equal(v3, 'hello3')
      }))

      it('deletes a key', async(() => {
        await(db.put('key1', 'hello!'))
        await(db.del('key1'))
        const value = db.get('key1')
        assert.equal(value, null)
      }))

      it('deletes a key after multiple updates', async(() => {
        await(db.put('key1', 'hello1'))
        await(db.put('key1', 'hello2'))
        await(db.put('key1', 'hello3'))
        await(db.del('key1'))
        const value = db.get('key1')
        assert.equal(value, null)
      }))

      it('get - integer value', async(() => {
        await(db.put('key1', 123))
        const v1 = db.get('key1')
        assert.equal(v1, 123)
      }))

      it('get - object value', (done) => {
        const val = { one: 'first', two: 2 }
        db.put('key1', val).then(() => {
          const v1 = db.get('key1')
          assert.equal(_.isEqual(v1, val), true)
          done()
        })
      })

      it('get - array value', async(() => {
        const val = [1, 2, 3, 4, 5]
        await(db.put('key1', val))
        const v1 = db.get('key1')
        assert.equal(_.isEqual(v1, val), true)
      }))

      it('syncs databases', async(() => {
        const db2 = await(client2.kvstore(channel, { subscribe: false }))
        db2.delete()
        db2.events.on('write', async((dbname, hash) => {
          await(db.sync(hash))
          const value = db.get('key1')
          assert.equal(value, 'hello2')
        }))
      }))
    })

    describe('Document Store - default index \'_id\'', function() {
      beforeEach(() => {
        db = client.docstore(channel, { subscribe: false })
        db.delete()
      })

      afterEach(() => {
        db.close()
      })

      it('put', async(() => {
        await(db.put({ _id: 'hello world', doc: 'all the things'}))
        const value = db.get('hello world')
        assert.deepEqual(value, [{ _id: 'hello world', doc: 'all the things'}])
      }))

      it('get - partial term match', async(() => {
        await(db.put({ _id: 'hello world', doc: 'some things'}))
        await(db.put({ _id: 'hello universe', doc: 'all the things'}))
        await(db.put({ _id: 'sup world', doc: 'other things'}))
        const value = db.get('hello')
        assert.deepEqual(value, [{ _id: 'hello world', doc: 'some things' },
                                 { _id: 'hello universe', doc: 'all the things'}])
      }))

      it('get after delete', async(() => {
        await(db.put({ _id: 'hello world', doc: 'some things'}))
        await(db.put({ _id: 'hello universe', doc: 'all the things'}))
        await(db.put({ _id: 'sup world', doc: 'other things'}))
        await(db.del('hello universe'))
        const value = db.get('hello')
        assert.deepEqual(value, [{ _id: 'hello world', doc: 'some things'}])
      }))

      it('put updates a value', async(() => {
        await(db.put({ _id: 'hello world', doc: 'all the things'}))
        await(db.put({ _id: 'hello world', doc: 'some of the things'}))
        const value = db.get('hello')
        assert.deepEqual(value, [{ _id: 'hello world', doc: 'some of the things'}])
      }))

      it('query', async(() => {
        await(db.put({ _id: 'hello world', doc: 'all the things', views: 17}))
        await(db.put({ _id: 'sup world', doc: 'some of the things', views: 10}))
        await(db.put({ _id: 'hello other world', doc: 'none of the things', views: 5}))
        await(db.put({ _id: 'hey universe', doc: ''}))
        const value = db.query((e) => e.views > 5)
        assert.deepEqual(value, [{ _id: 'hello world', doc: 'all the things', views: 17},
                                 { _id: 'sup world', doc: 'some of the things', views: 10}])
      }))

      it('query after delete', async(() => {
        await(db.put({ _id: 'hello world', doc: 'all the things', views: 17}))
        await(db.put({ _id: 'sup world', doc: 'some of the things', views: 10}))
        await(db.put({ _id: 'hello other world', doc: 'none of the things', views: 5}))
        await(db.del('hello world'))
        await(db.put({ _id: 'hey universe', doc: ''}))
        const value = db.query((e) => e.views > 5)
        assert.deepEqual(value, [{ _id: 'sup world', doc: 'some of the things', views: 10}])
      }))
    })

    describe('Document Store - specified index', function() {
      beforeEach(() => {
        db = client.docstore(channel, { subscribe: false, indexBy: 'doc' })
        db.delete()
      })

      afterEach(() => {
        db.close()
      })

      it('put', async(() => {
        await(db.put({ _id: 'hello world', doc: 'all the things'}))
        const value = db.get('all')
        assert.deepEqual(value, [{ _id: 'hello world', doc: 'all the things'}])
      }))

      it('get - matches specified index', async(() => {
        await(db.put({ _id: 'hello universe', doc: 'all the things'}))
        await(db.put({ _id: 'hello world', doc: 'some things'}))
        const value = db.get('all')
        assert.deepEqual(value, [{ _id: 'hello universe', doc: 'all the things'}])
      }))
    })
  })

})
