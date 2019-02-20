const databases = [
  {
    type: 'eventlog',
    create: (orbitdb, name, options) => orbitdb.eventlog(name, options),
    tryInsert: (db) => db.add('hello'),
    query: (db) => db.iterator({ limit: -1 }).collect(),
    getTestValue: (db) => db.iterator({ limit: -1 }).collect()[0].payload.value,
    expectedValue: 'hello',
  },
  {
    type: 'feed',
    create: (orbitdb, name, options) => orbitdb.feed(name, options),
    tryInsert: (db) => db.add('hello'),
    query: (db) => db.iterator({ limit: -1 }).collect(),
    getTestValue: (db) => db.iterator({ limit: -1 }).collect()[0].payload.value,
    expectedValue: 'hello',
  },
  {
    type: 'key-value',
    create: (orbitdb, name, options) => orbitdb.kvstore(name, options),
    tryInsert: (db) => db.set('one', 'hello'),
    query: (db) => [],
    getTestValue: (db) => db.get('one'),
    expectedValue: 'hello',
  },
  {
    type: 'documents',
    create: (orbitdb, name, options) => orbitdb.docstore(name, options),
    tryInsert: (db) => db.put({ _id: 'hello world', doc: 'all the things'}),
    query: (db) => [],
    getTestValue: (db) => db.get('hello world'),
    expectedValue: [{ _id: 'hello world', doc: 'all the things'}],
  },
  {
    type: 'counter',
    create: (orbitdb, name, options) => orbitdb.counter(name, options),
    tryInsert: (db) => db.inc(8),
    query: (db) => [],
    getTestValue: (db) => db.value,
    expectedValue: 8,
  },
]

module.exports = databases
