import { strictEqual, notStrictEqual, deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Entry, Identities, KeyStore } from '../../src/index.js'
import { Clock } from '../../src/oplog/log.js'
import { MemoryStorage } from '../../src/storage/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const keysPath = './testkeys'

const last = (arr) => {
  return arr[arr.length - 1]
}

describe('Log - Join', async function () {
  this.timeout(5000)

  let keystore
  let log1, log2, log3, log4
  let identities1, identities2, identities3, identities4
  let testIdentity, testIdentity2, testIdentity3, testIdentity4

  before(async () => {
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities1 = await Identities({ keystore })
    identities2 = await Identities({ keystore })
    identities3 = await Identities({ keystore })
    identities4 = await Identities({ keystore })
    testIdentity = await identities1.createIdentity({ id: 'userX' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })
    testIdentity3 = await identities3.createIdentity({ id: 'userC' })
    testIdentity4 = await identities4.createIdentity({ id: 'userA' })
  })

  after(async () => {
    if (keystore) {
      await keystore.close()
    }
    await rimraf(keysPath)
  })

  beforeEach(async () => {
    log1 = await Log(testIdentity, { logId: 'X' })
    log2 = await Log(testIdentity2, { logId: 'X' })
    log3 = await Log(testIdentity3, { logId: 'X' })
    log4 = await Log(testIdentity4, { logId: 'X' })
  })

  it('joins logs', async () => {
    const items1 = []
    const items2 = []
    const amount = 20

    for (let i = 1; i <= amount; i++) {
      const n1 = await log1.append('entryA' + i)
      const n2 = await log2.append('entryB' + i)
      items1.push(n1)
      items2.push(n2)
    }

    strictEqual(items1.length, amount)
    strictEqual(items2.length, amount)

    const valuesA = await log1.values()
    const valuesB = await log2.values()

    strictEqual(valuesA.length, amount)
    strictEqual(valuesB.length, amount)

    await log1.join(log2)

    const valuesC = await log1.values()

    strictEqual(valuesC.length, amount * 2)
    strictEqual((await log1.heads()).length, 2)
  })

  it('throws an error if first log is not defined', async () => {
    let err
    try {
      await log1.join()
    } catch (e) {
      err = e
    }
    notStrictEqual(err, null)
    strictEqual(err.message, 'Log instance not defined')
  })

  it('throws an error if passed argument is not an instance of Log', async () => {
    let err
    try {
      await log1.join({})
    } catch (e) {
      err = e
    }
    notStrictEqual(err, null)
    strictEqual(err.message, 'Given argument is not an instance of Log')
  })

  it('throws an error if trying to join an entry from a different log', async () => {
    const logIdA = 'AAA'
    const logIdB = 'BBB'
    let err
    try {
      const logA = await Log(testIdentity, { logId: logIdA })
      await logA.append('entryA')
      const logB = await Log(testIdentity, { logId: logIdB })
      await logB.append('entryB')
      const valuesB = await logB.values()
      await logA.joinEntry(last(valuesB))
    } catch (e) {
      err = e
    }
    notStrictEqual(err, null)
    strictEqual(err.message, `Entry's id (${logIdB}) doesn't match the log's id (${logIdA}).`)
  })

  it('throws an error if trying to join a different log', async () => {
    const logIdA = 'AAA'
    const logIdB = 'BBB'
    let err
    try {
      const logA = await Log(testIdentity, { logId: logIdA })
      await logA.append('entryA')
      const logB = await Log(testIdentity, { logId: logIdB })
      await logB.append('entryB')
      await logA.join(logB)
    } catch (e) {
      err = e
    }
    notStrictEqual(err, null)
    strictEqual(err.message, `Entry's id (${logIdB}) doesn't match the log's id (${logIdA}).`)
  })

  it('joins only unique items', async () => {
    await log1.append('helloA1')
    await log1.append('helloA2')
    await log2.append('helloB1')
    await log2.append('helloB2')
    await log1.join(log2)
    await log1.join(log2)

    const expectedData = [
      'helloA1', 'helloB1', 'helloA2', 'helloB2'
    ]

    const values = await log1.values()
    strictEqual(values.length, 4)
    deepStrictEqual(values.map((e) => e.payload), expectedData)

    const item = last(values)
    strictEqual(item.next.length, 1)
  })

  it('joins logs two ways', async () => {
    await log1.append('helloA1')
    await log1.append('helloA2')
    await log2.append('helloB1')
    await log2.append('helloB2')
    await log1.join(log2)
    await log2.join(log1)

    const expectedData = [
      'helloA1', 'helloB1', 'helloA2', 'helloB2'
    ]

    const values1 = await log1.values()
    const values2 = await log2.values()

    deepStrictEqual(values1.map((e) => e.hash), values2.map((e) => e.hash))
    deepStrictEqual(values1.map((e) => e.payload), expectedData)
    deepStrictEqual(values2.map((e) => e.payload), expectedData)
  })

  it('joins logs twice', async () => {
    await log1.append('helloA1')
    await log2.append('helloB1')
    await log2.join(log1)

    await log1.append('helloA2')
    await log2.append('helloB2')
    await log2.join(log1)

    const expectedData = [
      'helloA1', 'helloB1', 'helloA2', 'helloB2'
    ]

    const values = await log2.values()

    strictEqual(values.length, 4)
    deepStrictEqual(values.map((e) => e.payload), expectedData)
  })

  it('joins 2 logs two ways', async () => {
    await log1.append('helloA1')
    await log2.append('helloB1')
    await log2.join(log1)
    await log1.join(log2)
    await log1.append('helloA2')
    await log2.append('helloB2')
    await log2.join(log1)

    const expectedData = [
      'helloA1', 'helloB1', 'helloA2', 'helloB2'
    ]

    const values = await log2.values()

    strictEqual(values.length, 4)
    deepStrictEqual(values.map((e) => e.payload), expectedData)
  })

  it('joins 2 logs two ways and has the right heads at every step', async () => {
    await log1.append('helloA1')
    const heads1 = await log1.heads()
    strictEqual(heads1.length, 1)
    strictEqual(heads1[0].payload, 'helloA1')

    await log2.append('helloB1')
    const heads2 = await log2.heads()
    strictEqual(heads2.length, 1)
    strictEqual(heads2[0].payload, 'helloB1')

    await log2.join(log1)
    const heads3 = await log2.heads()
    strictEqual(heads3.length, 2)
    strictEqual(heads3[0].payload, 'helloB1')
    strictEqual(heads3[1].payload, 'helloA1')

    await log1.join(log2)
    const heads4 = await log1.heads()
    strictEqual(heads4.length, 2)
    strictEqual(heads4[0].payload, 'helloB1')
    strictEqual(heads4[1].payload, 'helloA1')

    await log1.append('helloA2')
    const heads5 = await log1.heads()
    strictEqual(heads5.length, 1)
    strictEqual(heads5[0].payload, 'helloA2')

    await log2.append('helloB2')
    const heads6 = await log2.heads()
    strictEqual(heads6.length, 1)
    strictEqual(heads6[0].payload, 'helloB2')

    await log2.join(log1)
    const heads7 = await log2.heads()
    strictEqual(heads7.length, 2)
    strictEqual(heads7[0].payload, 'helloB2')
    strictEqual(heads7[1].payload, 'helloA2')
  })

  it('joins 4 logs to one', async () => {
    // order determined by identity's publicKey
    await log3.append('helloA1')
    await log3.append('helloA2')

    await log1.append('helloB1')
    await log1.append('helloB2')

    await log2.append('helloC1')
    await log2.append('helloC2')

    await log4.append('helloD1')
    await log4.append('helloD2')

    await log1.join(log2)
    await log1.join(log3)
    await log1.join(log4)

    const expectedData = [
      'helloA1',
      'helloB1',
      'helloC1',
      'helloD1',
      'helloA2',
      'helloB2',
      'helloC2',
      'helloD2'
    ]

    const values = await log1.values()

    strictEqual(values.length, 8)
    deepStrictEqual(values.map(e => e.payload), expectedData)
  })

  it('joins 4 logs to one is commutative', async () => {
    await log1.append('helloA1')
    await log1.append('helloA2')
    await log2.append('helloB1')
    await log2.append('helloB2')
    await log3.append('helloC1')
    await log3.append('helloC2')
    await log4.append('helloD1')
    await log4.append('helloD2')
    await log1.join(log2)
    await log1.join(log3)
    await log1.join(log4)
    await log2.join(log1)
    await log2.join(log3)
    await log2.join(log4)

    const values1 = await log1.values()
    const values2 = await log1.values()

    strictEqual(values1.length, 8)
    strictEqual(values2.length, 8)
    deepStrictEqual(values1.map(e => e.payload), values2.map(e => e.payload))
  })

  it('joins logs and updates clocks', async () => {
    await log1.append('helloA1')
    await log2.append('helloB1')
    await log2.join(log1)
    await log1.append('helloA2')
    await log2.append('helloB2')

    strictEqual((await log1.clock()).id, testIdentity.publicKey)
    strictEqual((await log2.clock()).id, testIdentity2.publicKey)
    strictEqual((await log1.clock()).time, 2)
    strictEqual((await log2.clock()).time, 2)

    await log3.join(log1)
    strictEqual(log3.id, 'X')
    strictEqual((await log3.clock()).id, testIdentity3.publicKey)
    strictEqual((await log3.clock()).time, 2)

    await log3.append('helloC1')
    await log3.append('helloC2')
    await log1.join(log3)
    await log1.join(log2)
    await log4.append('helloD1')
    await log4.append('helloD2')
    await log4.join(log2)
    await log4.join(log1)
    await log4.join(log3)
    await log4.append('helloD3')
    await log4.append('helloD4')

    await log1.join(log4)
    await log4.join(log1)
    await log4.append('helloD5')
    await log1.append('helloA5')
    await log4.join(log1)
    strictEqual((await log4.clock()).id, testIdentity4.publicKey)
    strictEqual((await log4.clock()).time, 7)

    await log4.append('helloD6')
    strictEqual((await log4.clock()).time, 8)

    const expectedData = [
      { payload: 'helloA1', id: 'X', clock: Clock(testIdentity.publicKey, 1) },
      { payload: 'helloB1', id: 'X', clock: Clock(testIdentity2.publicKey, 1) },
      { payload: 'helloD1', id: 'X', clock: Clock(testIdentity4.publicKey, 1) },
      { payload: 'helloA2', id: 'X', clock: Clock(testIdentity.publicKey, 2) },
      { payload: 'helloB2', id: 'X', clock: Clock(testIdentity2.publicKey, 2) },
      { payload: 'helloD2', id: 'X', clock: Clock(testIdentity4.publicKey, 2) },
      { payload: 'helloC1', id: 'X', clock: Clock(testIdentity3.publicKey, 3) },
      { payload: 'helloC2', id: 'X', clock: Clock(testIdentity3.publicKey, 4) },
      { payload: 'helloD3', id: 'X', clock: Clock(testIdentity4.publicKey, 5) },
      { payload: 'helloD4', id: 'X', clock: Clock(testIdentity4.publicKey, 6) },
      { payload: 'helloA5', id: 'X', clock: Clock(testIdentity.publicKey, 7) },
      { payload: 'helloD5', id: 'X', clock: Clock(testIdentity4.publicKey, 7) },
      { payload: 'helloD6', id: 'X', clock: Clock(testIdentity4.publicKey, 8) }
    ]

    const values = await log4.values()

    const transformed = values.map((e) => {
      return { payload: e.payload, id: e.id, clock: e.clock }
    })

    strictEqual(values.length, 13)
    deepStrictEqual(transformed, expectedData)
  })

  it('joins logs from 4 logs', async () => {
    await log1.append('helloA1')
    await log1.join(log2)
    await log2.append('helloB1')
    await log2.join(log1)
    await log1.append('helloA2')
    await log2.append('helloB2')

    await log1.join(log3)
    strictEqual(log1.id, 'X')
    strictEqual((await log1.clock()).id, testIdentity.publicKey)
    strictEqual((await log1.clock()).time, 2)

    await log3.join(log1)
    strictEqual(log3.id, 'X')
    strictEqual((await log3.clock()).id, testIdentity3.publicKey)
    strictEqual((await log3.clock()).time, 2)

    await log3.append('helloC1')
    await log3.append('helloC2')
    await log1.join(log3)
    await log1.join(log2)
    await log4.append('helloD1')
    await log4.append('helloD2')
    await log4.join(log2)
    await log4.join(log1)
    await log4.join(log3)
    await log4.append('helloD3')
    await log4.append('helloD4')

    strictEqual((await log4.clock()).id, testIdentity4.publicKey)
    strictEqual((await log4.clock()).time, 6)

    const expectedData = [
      'helloA1',
      'helloB1',
      'helloD1',
      'helloA2',
      'helloB2',
      'helloD2',
      'helloC1',
      'helloC2',
      'helloD3',
      'helloD4'
    ]

    const values = await log4.values()

    strictEqual(values.length, 10)
    deepStrictEqual(values.map((e) => e.payload), expectedData)
  })

  it('doesn\'t add the given entry to the log when the given entry is already in the log', async () => {
    const e1 = await log1.append('hello1')
    const e2 = await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const all1 = await log2.all()

    deepStrictEqual(all1.length, 3)
    deepStrictEqual(all1[0], e1)
    deepStrictEqual(all1[1], e2)
    deepStrictEqual(all1[2], e3)

    await log2.joinEntry(e1)
    await log2.joinEntry(e2)
    await log2.joinEntry(e3)

    const all2 = await log2.all()

    deepStrictEqual(all2.length, 3)
    deepStrictEqual(all2[0], e1)
    deepStrictEqual(all2[1], e2)
    deepStrictEqual(all2[2], e3)
  })

  it('doesn\'t add the given entry to the heads when the given entry is already in the log', async () => {
    const e1 = await log1.append('hello1')
    const e2 = await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const heads1 = await log2.heads()

    deepStrictEqual(heads1, [e3])

    await log2.joinEntry(e1)
    await log2.joinEntry(e2)
    await log2.joinEntry(e3)

    const heads2 = await log2.heads()

    strictEqual(heads2.length, 1)
    deepStrictEqual(heads2[0].hash, e3.hash)
  })

  it('joinEntry returns false when the given entry is already in the log', async () => {
    const e1 = await log1.append('hello1')
    const e2 = await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const heads1 = await log2.heads()

    deepStrictEqual(heads1, [e3])

    const r1 = await log2.joinEntry(e1)
    const r2 = await log2.joinEntry(e2)
    const r3 = await log2.joinEntry(e3)

    deepStrictEqual([r1, r2, r3].every(e => e === false), true)
  })

  it('replaces the heads if the given entry is a new head and has a direct path to the old head', async () => {
    await log1.append('hello1')
    await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const heads1 = await log2.heads()

    deepStrictEqual(heads1, [e3])

    await log1.append('hello4')
    await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e6)

    const heads2 = await log2.heads()
    const all = await log2.all()

    strictEqual(heads2.length, 1)
    deepStrictEqual(heads2[0].hash, e6.hash)
    strictEqual(all.length, 6)
    deepStrictEqual(all.map(e => e.payload), ['hello1', 'hello2', 'hello3', 'hello4', 'hello5', 'hello6'])
  })

  it('replaces a head when given entry is a new head and there are multiple current heads', async () => {
    await log1.append('hello1')
    await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.append('helloA')
    await log2.append('helloB')
    const eC = await log2.append('helloC')

    await log3.join(log1)
    await log3.join(log2)

    const heads1 = await log3.heads()

    deepStrictEqual(heads1, [eC, e3])

    await log1.append('hello4')
    await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log1.storage.merge(log3.storage)
    await log3.storage.merge(log1.storage)
    await log2.storage.merge(log1.storage)
    await log2.storage.merge(log3.storage)

    await log3.joinEntry(e6)

    const heads2 = await log3.heads()

    strictEqual(heads2.length, 2)
    deepStrictEqual(heads2[0].hash, e6.hash)
    deepStrictEqual(heads2[1].hash, eC.hash)
  })

  it('replaces both heads when given entries are new heads and there are two current heads', async () => {
    await log1.append('hello1')
    await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.append('helloA')
    await log2.append('helloB')
    const eC = await log2.append('helloC')

    await log3.join(log1)
    await log3.join(log2)

    const heads1 = await log3.heads()

    deepStrictEqual(heads1, [eC, e3])

    await log1.append('hello4')
    await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log2.append('helloD')
    await log2.append('helloE')
    const eF = await log2.append('helloF')

    await log3.storage.merge(log1.storage)
    await log3.storage.merge(log2.storage)

    await log3.joinEntry(e6)
    await log3.joinEntry(eF)

    const heads2 = await log3.heads()

    strictEqual(heads2.length, 2)
    deepStrictEqual(heads2[0].hash, eF.hash)
    deepStrictEqual(heads2[1].hash, e6.hash)
  })

  it('adds the given entry to the heads when forked logs have multiple heads', async () => {
    await log1.append('hello1')
    await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const heads1 = await log1.heads()
    const heads2 = await log2.heads()

    deepStrictEqual(heads1, [e3])
    deepStrictEqual(heads2, [e3])

    await log2.append('helloX')
    const eY = await log2.append('helloY')

    await log1.append('hello4')
    await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e6)

    const heads3 = await log2.heads()

    strictEqual(heads3.length, 2)
    deepStrictEqual(heads3[0].hash, e6.hash)
    deepStrictEqual(heads3[1].hash, eY.hash)
  })

  it('replaces one head but not the other when forked logs have multiple heads', async () => {
    await log1.append('hello1')
    await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const heads1 = await log1.heads()
    const heads2 = await log2.heads()

    deepStrictEqual(heads1, [e3])
    deepStrictEqual(heads2, [e3])

    await log2.append('helloX')
    const eY = await log2.append('helloY')

    await log1.append('hello4')
    await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e6)

    const heads3 = await log2.heads()

    strictEqual(heads3.length, 2)
    deepStrictEqual(heads3[0].hash, e6.hash)
    deepStrictEqual(heads3[1].hash, eY.hash)

    await log1.append('hello7')
    const e8 = await log1.append('hello8')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e8)

    const heads4 = await log2.heads()

    strictEqual(heads4.length, 2)
    deepStrictEqual(heads4[0].hash, e8.hash)
    deepStrictEqual(heads4[1].hash, eY.hash)
  })

  it('doesn\'t add the joined entry to the log when previously joined logs have forks and multiple heads', async () => {
    const e1 = await log1.append('hello1')
    const e2 = await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.join(log1)

    const heads1 = await log1.heads()
    const heads2 = await log2.heads()

    deepStrictEqual(heads1, [e3])
    deepStrictEqual(heads2, [e3])

    await log2.append('helloX')
    const eY = await log2.append('helloY')

    const e4 = await log1.append('hello4')
    const e5 = await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e6)

    const res5 = await log2.joinEntry(e5)
    const res4 = await log2.joinEntry(e4)
    const res3 = await log2.joinEntry(e3)
    const res2 = await log2.joinEntry(e2)
    const res1 = await log2.joinEntry(e1)

    strictEqual(res1, false)
    strictEqual(res2, false)
    strictEqual(res3, false)
    strictEqual(res4, false)
    strictEqual(res5, false)

    const heads3 = await log2.heads()

    strictEqual(heads3.length, 2)
    deepStrictEqual(heads3[0].hash, e6.hash)
    deepStrictEqual(heads3[1].hash, eY.hash)
  })

  it('replaces both heads when forked logs have multiple heads', async () => {
    await log1.append('hello1')
    await log1.append('hello2')
    const e3 = await log1.append('hello3')

    await log2.append('helloA')
    await log2.append('helloB')
    const eC = await log2.append('helloC')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e3)

    const heads1 = await log2.heads()

    strictEqual(heads1.length, 2)
    deepStrictEqual(heads1[0].hash, eC.hash)
    deepStrictEqual(heads1[1].hash, e3.hash)

    await log1.append('hello4')
    await log1.append('hello5')
    const e6 = await log1.append('hello6')

    await log2.append('helloD')
    await log2.append('helloE')
    const eF = await log2.append('helloF')

    await log2.storage.merge(log1.storage)

    await log2.joinEntry(e6)

    const heads2 = await log2.heads()

    strictEqual(heads2.length, 2)
    deepStrictEqual(heads2[0].hash, eF.hash)
    deepStrictEqual(heads2[1].hash, e6.hash)
  })

  describe('trying to join an entry with invalid preceeding entries', () => {
    it('throws an error if an entry belongs to another log', async () => {
      const headsStorage1 = await MemoryStorage()

      const log0 = await Log(testIdentity2, { logId: 'Y' })
      log1 = await Log(testIdentity, { logId: 'X', headsStorage: headsStorage1 })
      log2 = await Log(testIdentity2, { logId: 'X' })

      const e0 = await log0.append('helloA')

      await log1.storage.merge(log0.storage)

      await headsStorage1.put(e0.hash, e0.bytes)

      await log1.append('hello1')
      await log1.append('hello2')
      const e3 = await log1.append('hello3')

      await log2.storage.merge(log1.storage)

      let err
      try {
        await log2.joinEntry(e3)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Entry\'s id (Y) doesn\'t match the log\'s id (X).')
      deepStrictEqual(await log2.all(), [])
      deepStrictEqual(await log2.heads(), [])
    })

    it('throws an error if an entry doesn\'t pass access controller #1', async () => {
      const canAppend = (entry) => {
        if (entry.payload === 'hello1') {
          return false
        }
        return true
      }

      log1 = await Log(testIdentity, { logId: 'X' })
      log2 = await Log(testIdentity2, { logId: 'X', access: { canAppend } })

      await log1.append('hello1')
      await log1.append('hello2')
      const e3 = await log1.append('hello3')

      await log2.storage.merge(log1.storage)

      let err
      try {
        await log2.joinEntry(e3)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Could not append entry:\nKey "zdpuAvqN22Rxwx5EEenq6EyeydVKPKn43MXHzauuicjLEp8jP" is not allowed to write to the log')
      deepStrictEqual(await log2.all(), [])
      deepStrictEqual(await log2.heads(), [])
    })

    it('throws an error if an entry doesn\'t pass access controller #2', async () => {
      const canAppend = (entry) => {
        if (entry.payload === 'hello2') {
          return false
        }
        return true
      }

      log1 = await Log(testIdentity, { logId: 'X' })
      log2 = await Log(testIdentity2, { logId: 'X' })
      log3 = await Log(testIdentity3, { logId: 'X', access: { canAppend } })

      await log1.append('hello1')
      await log1.append('hello2')
      const e3 = await log1.append('hello3')

      await log2.append('helloA')
      await log2.append('helloB')
      const eC = await log2.append('helloC')

      await log3.storage.merge(log1.storage)
      await log3.storage.merge(log2.storage)

      await log3.joinEntry(eC)

      await log2.storage.merge(log1.storage)

      await log2.joinEntry(e3)

      await log2.append('helloD')
      await log2.append('helloE')
      const eF = await log2.append('helloF')

      await log3.storage.merge(log1.storage)
      await log3.storage.merge(log2.storage)

      let err
      try {
        await log3.joinEntry(eF)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Could not append entry:\nKey "zdpuAvqN22Rxwx5EEenq6EyeydVKPKn43MXHzauuicjLEp8jP" is not allowed to write to the log')

      deepStrictEqual((await log3.all()).map(e => e.payload), ['helloA', 'helloB', 'helloC'])
      deepStrictEqual((await log3.heads()).map(e => e.payload), ['helloC'])
    })
  })

  describe('throws an error if verification of an entry in given entry\'s history fails', async () => {
    let e1, e3
    let headsStorage1, headsStorage2

    before(async () => {
      headsStorage1 = await MemoryStorage()
      headsStorage2 = await MemoryStorage()

      log1 = await Log(testIdentity, { logId: 'X', entryStorage: headsStorage1 })
      log2 = await Log(testIdentity2, { logId: 'X', entryStorage: headsStorage2 })

      e1 = await log1.append('hello1')
      await log1.append('hello2')
      e3 = await log1.append('hello3')
    })

    it('throws an error if an entry doesn\'t have a payload field', async () => {
      const e = Object.assign({}, e1)
      delete e.payload

      delete e.bytes
      delete e.hash
      const ee = await Entry.encode(e)

      await headsStorage1.put(e1.hash, ee.bytes)
      await log2.storage.merge(headsStorage1)

      let err
      try {
        await log2.joinEntry(e3)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Invalid Log entry')
      deepStrictEqual(await log2.all(), [])
      deepStrictEqual(await log2.heads(), [])
    })

    it('throws an error if an entry doesn\'t have a key field', async () => {
      const e = Object.assign({}, e1)
      delete e.key

      delete e.bytes
      delete e.hash
      const ee = await Entry.encode(e)

      await headsStorage1.put(e1.hash, ee.bytes)
      await log2.storage.merge(headsStorage1)

      let err
      try {
        await log2.joinEntry(e3)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Entry doesn\'t have a key')
      deepStrictEqual(await log2.all(), [])
      deepStrictEqual(await log2.heads(), [])
    })

    it('throws an error if an entry doesn\'t have a signature field', async () => {
      const e = Object.assign({}, e1)
      delete e.sig

      delete e.bytes
      delete e.hash
      const ee = await Entry.encode(e)

      await headsStorage1.put(e1.hash, ee.bytes)
      await log2.storage.merge(headsStorage1)

      let err
      try {
        await log2.joinEntry(e3)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Entry doesn\'t have a signature')
      deepStrictEqual(await log2.all(), [])
      deepStrictEqual(await log2.heads(), [])
    })

    it('throws an error if an entry signature doesn\'t verify', async () => {
      const e = Object.assign({}, e1)
      e.sig = '1234567890'
      delete e.bytes
      delete e.hash
      const ee = await Entry.encode(e)

      await headsStorage1.put(e1.hash, ee.bytes)
      await log2.storage.merge(headsStorage1)

      let err
      try {
        await log2.joinEntry(e3)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Could not validate signature for entry "zdpuAvkAJ8C46cnGdtFpcBratA5MqK7CcjqCJjjmuKuFvZir3"')
      deepStrictEqual(await log2.all(), [])
      deepStrictEqual(await log2.heads(), [])
    })
  })
})
