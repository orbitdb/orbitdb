// import { strictEqual, deepStrictEqual, notStrictEqual, throws } from 'assert'
// import rimraf from 'rimraf'
// import { copy } from 'fs-extra'
// import { Log, Entry, Sorting } from '../../src/oplog/index.js'
// import { Identities, KeyStore } from '../../src/index.js'
// import bigLogString from '../fixtures/big-log.fixture.js'
// import LogCreator from './utils/log-creator.js'
// import testKeysPath from '../fixtures/test-keys-path.js'
// import { config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'

// const { sync: rimraf } = rimraf
// const { LastWriteWins } = Sorting
// const { createIdentity } = Identities
// const { fromJSON, fromEntryHash, fromEntry, fromMultihash: _fromMultihash } = Log
// const { fromMultihash, create, compare } = Entry
// const { createLogWithSixteenEntries, createLogWithTwoHundredEntries } = LogCreator

// // Alternate tiebreaker. Always does the opposite of LastWriteWins
// const FirstWriteWins = (a, b) => LastWriteWins(a, b) * -1
// const BadComparatorReturnsZero = (a, b) => 0

// let ipfsd, ipfs, testIdentity, testIdentity2, testIdentity3, testIdentity4

// const last = (arr) => {
//   return arr[arr.length - 1]
// }

// Object.keys(testAPIs).forEach((IPFS) => {
//   describe.skip('Log - Load (' + IPFS + ')', function () {
//     this.timeout(config.timeout)

//     const { identityKeyFixtures, signingKeyFixtures, identityKeysPath } = config

//     const firstWriteExpectedData = [
//       'entryA6', 'entryA7', 'entryA8', 'entryA9',
//       'entryA10', 'entryB1', 'entryB2', 'entryB3',
//       'entryB4', 'entryB5', 'entryA1', 'entryA2',
//       'entryA3', 'entryA4', 'entryA5', 'entryC0'
//     ]

//     let keystore

//     before(async () => {
//       rimraf(identityKeysPath)

//       await copy(identityKeyFixtures, identityKeysPath)
//       await copy(signingKeyFixtures, identityKeysPath)

//       keystore = await KeyStore({ path: testKeysPath })

//       testIdentity = await createIdentity({ id: 'userC', keystore })
//       testIdentity2 = await createIdentity({ id: 'userB', keystore })
//       testIdentity3 = await createIdentity({ id: 'userD', keystore })
//       testIdentity4 = await createIdentity({ id: 'userA', keystore })
//       ipfsd = await startIpfs(IPFS, config.defaultIpfsConfig)
//       ipfs = ipfsd.api
//     })

//     after(async () => {
//       await stopIpfs(ipfsd)
//       await keystore.close()
//       rimraf(identityKeysPath)
//     })

//     describe('fromJSON', async () => {
//       let identities

//       before(async () => {
//         identities = [testIdentity, testIdentity2, testIdentity3, testIdentity4]
//       })

//       it('creates a log from an entry', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log
//         const json = fixture.json

//         json.heads = await Promise.all(json.heads.map(headHash => fromMultihash(ipfs, headHash)))

//         const log = await fromJSON(ipfs, testIdentity, json, { logId: 'X' })

//         strictEqual(log.id, data.heads[0].id)
//         strictEqual(log.length, 16)
//         deepStrictEqual(log.values.map(e => e.payload), fixture.expectedData)
//       })

//       it('creates a log from an entry with custom tiebreaker', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log
//         const json = fixture.json

//         json.heads = await Promise.all(json.heads.map(headHash => fromMultihash(ipfs, headHash)))

//         const log = await fromJSON(ipfs, testIdentity, json,
//           { length: -1, logId: 'X', sortFn: FirstWriteWins })

//         strictEqual(log.id, data.heads[0].id)
//         strictEqual(log.length, 16)
//         deepStrictEqual(log.values.map(e => e.payload), firstWriteExpectedData)
//       })

//       it('respects timeout parameter', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const json = fixture.json
//         json.heads = [{ hash: 'zdpuAwNuRc2Kc1aNDdcdSWuxfNpHRJQw8L8APBNHCEFXbogus' }]

//         const timeout = 500
//         const st = new Date().getTime()
//         const log = await fromJSON(ipfs, testIdentity, json, { logId: 'X', timeout })
//         const et = new Date().getTime()
//         // Allow for a few millseconds of skew
//         strictEqual((et - st) >= (timeout - 10), true, '' + (et - st) + ' should be greater than timeout ' + timeout)
//         strictEqual(log.length, 0)
//         deepStrictEqual(log.values.map(e => e.payload), [])
//       })
//     })

//     describe('fromEntryHash', () => {
//       let identities

//       before(async () => {
//         identities = [testIdentity, testIdentity2, testIdentity3, testIdentity4]
//       })

//       it('creates a log from an entry hash', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log
//         const json = fixture.json

//         const log1 = await fromEntryHash(ipfs, testIdentity, json.heads[0],
//           { logId: 'X' })
//         const log2 = await fromEntryHash(ipfs, testIdentity, json.heads[1],
//           { logId: 'X' })

//         await log1.join(log2)

//         strictEqual(log1.id, data.heads[0].id)
//         strictEqual(log1.length, 16)
//         deepStrictEqual(log1.values.map(e => e.payload), fixture.expectedData)
//       })

//       it('creates a log from an entry hash with custom tiebreaker', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log
//         const json = fixture.json
//         const log1 = await fromEntryHash(ipfs, testIdentity, json.heads[0],
//           { logId: 'X', sortFn: FirstWriteWins })
//         const log2 = await fromEntryHash(ipfs, testIdentity, json.heads[1],
//           { logId: 'X', sortFn: FirstWriteWins })

//         await log1.join(log2)

//         strictEqual(log1.id, data.heads[0].id)
//         strictEqual(log1.length, 16)
//         deepStrictEqual(log1.values.map(e => e.payload), firstWriteExpectedData)
//       })

//       it('respects timeout parameter', async () => {
//         const timeout = 500
//         const st = new Date().getTime()
//         const log = await fromEntryHash(ipfs, testIdentity, 'zdpuAwNuRc2Kc1aNDdcdSWuxfNpHRJQw8L8APBNHCEFXbogus', { logId: 'X', timeout })
//         const et = new Date().getTime()
//         strictEqual((et - st) >= timeout, true, '' + (et - st) + ' should be greater than timeout ' + timeout)
//         strictEqual(log.length, 0)
//         deepStrictEqual(log.values.map(e => e.payload), [])
//       })
//     })

//     describe('fromEntry', () => {
//       let identities

//       before(async () => {
//         identities = [testIdentity3, testIdentity2, testIdentity, testIdentity4]
//       })

//       it('creates a log from an entry', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log

//         const log = await fromEntry(ipfs, testIdentity, data.heads, { length: -1 })
//         strictEqual(log.id, data.heads[0].id)
//         strictEqual(log.length, 16)
//         deepStrictEqual(log.values.map(e => e.payload), fixture.expectedData)
//       })

//       it('creates a log from an entry with custom tiebreaker', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log

//         const log = await fromEntry(ipfs, testIdentity, data.heads,
//           { length: -1, sortFn: FirstWriteWins })
//         strictEqual(log.id, data.heads[0].id)
//         strictEqual(log.length, 16)
//         deepStrictEqual(log.values.map(e => e.payload), firstWriteExpectedData)
//       })

//       it('keeps the original heads', async () => {
//         const fixture = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const data = fixture.log

//         const log1 = await fromEntry(ipfs, testIdentity, data.heads,
//           { length: data.heads.length })
//         strictEqual(log1.id, data.heads[0].id)
//         strictEqual(log1.length, data.heads.length)
//         strictEqual(log1.values[0].payload, 'entryC0')
//         strictEqual(log1.values[1].payload, 'entryA10')

//         const log2 = await fromEntry(ipfs, testIdentity, data.heads, { length: 4 })
//         strictEqual(log2.id, data.heads[0].id)
//         strictEqual(log2.length, 4)
//         strictEqual(log2.values[0].payload, 'entryC0')
//         strictEqual(log2.values[1].payload, 'entryA8')
//         strictEqual(log2.values[2].payload, 'entryA9')
//         strictEqual(log2.values[3].payload, 'entryA10')

//         const log3 = await fromEntry(ipfs, testIdentity, data.heads, { length: 7 })
//         strictEqual(log3.id, data.heads[0].id)
//         strictEqual(log3.length, 7)
//         strictEqual(log3.values[0].payload, 'entryB5')
//         strictEqual(log3.values[1].payload, 'entryA6')
//         strictEqual(log3.values[2].payload, 'entryC0')
//         strictEqual(log3.values[3].payload, 'entryA7')
//         strictEqual(log3.values[4].payload, 'entryA8')
//         strictEqual(log3.values[5].payload, 'entryA9')
//         strictEqual(log3.values[6].payload, 'entryA10')
//       })

//       it('onProgress callback is fired for each entry', async () => {
//         const items1 = []
//         const amount = 100
//         for (let i = 1; i <= amount; i++) {
//           const prev1 = last(items1)
//           const n1 = await create(ipfs, testIdentity, 'A', 'entryA' + i, [prev1])
//           items1.push(n1)
//         }

//         let i = 0
//         const callback = (entry) => {
//           notStrictEqual(entry, null)
//           strictEqual(entry.hash, items1[items1.length - i - 1].hash)
//           strictEqual(entry.payload, items1[items1.length - i - 1].payload)
//           i++
//         }

//         await fromEntry(ipfs, testIdentity, last(items1),
//           { length: -1, exclude: [], onProgressCallback: callback })
//       })

//       it('retrieves partial log from an entry hash', async () => {
//         const log1 = await Log(testIdentity, { logId: 'X' })
//         const log2 = await Log(testIdentity2, { logId: 'X' })
//         const log3 = await Log(testIdentity3, { logId: 'X' })
//         const items1 = []
//         const items2 = []
//         const items3 = []
//         const amount = 100
//         for (let i = 1; i <= amount; i++) {
//           const prev1 = last(items1)
//           const prev2 = last(items2)
//           const prev3 = last(items3)
//           const n1 = await create(ipfs, log1._identity, 'X', 'entryA' + i, [prev1])
//           const n2 = await create(ipfs, log2._identity, 'X', 'entryB' + i, [prev2, n1])
//           const n3 = await create(ipfs, log3._identity, 'X', 'entryC' + i, [prev3, n1, n2])
//           items1.push(n1)
//           items2.push(n2)
//           items3.push(n3)
//         }

//         // limit to 10 entries
//         const a = await fromEntry(ipfs, testIdentity, last(items1), { length: 10 })
//         strictEqual(a.length, 10)

//         // limit to 42 entries
//         const b = await fromEntry(ipfs, testIdentity, last(items1), { length: 42 })
//         strictEqual(b.length, 42)
//       })

//       it('throws an error if trying to create a log from a hash of an entry', async () => {
//         const items1 = []
//         const amount = 5
//         for (let i = 1; i <= amount; i++) {
//           const prev1 = last(items1)
//           const n1 = await create(ipfs, testIdentity, 'A', 'entryA' + i, [prev1])
//           items1.push(n1)
//         }

//         let err
//         try {
//           await fromEntry(ipfs, testIdentity, last(items1).hash, { length: 1 })
//         } catch (e) {
//           err = e
//         }
//         strictEqual(err.message, '\'sourceEntries\' argument must be an array of Entry instances or a single Entry')
//       })

//       it('retrieves full log from an entry hash', async () => {
//         const log1 = await Log(testIdentity, { logId: 'X' })
//         const log2 = await Log(testIdentity2, { logId: 'X' })
//         const log3 = await Log(testIdentity3, { logId: 'X' })
//         const items1 = []
//         const items2 = []
//         const items3 = []
//         const amount = 10
//         for (let i = 1; i <= amount; i++) {
//           const prev1 = last(items1)
//           const prev2 = last(items2)
//           const prev3 = last(items3)
//           const n1 = await create(ipfs, log1._identity, 'X', 'entryA' + i, [prev1])
//           const n2 = await create(ipfs, log2._identity, 'X', 'entryB' + i, [prev2, n1])
//           const n3 = await create(ipfs, log3._identity, 'X', 'entryC' + i, [prev3, n2])
//           items1.push(n1)
//           items2.push(n2)
//           items3.push(n3)
//         }

//         const a = await fromEntry(ipfs, testIdentity, [last(items1)],
//           { length: amount })
//         strictEqual(a.length, amount)

//         const b = await fromEntry(ipfs, testIdentity2, [last(items2)],
//           { length: amount * 2 })
//         strictEqual(b.length, amount * 2)

//         const c = await fromEntry(ipfs, testIdentity3, [last(items3)],
//           { length: amount * 3 })
//         strictEqual(c.length, amount * 3)
//       })

//       it('retrieves full log from an entry hash 2', async () => {
//         const log1 = await Log(testIdentity, { logId: 'X' })
//         const log2 = await Log(testIdentity2, { logId: 'X' })
//         const log3 = await Log(testIdentity3, { logId: 'X' })
//         const items1 = []
//         const items2 = []
//         const items3 = []
//         const amount = 10
//         for (let i = 1; i <= amount; i++) {
//           const prev1 = last(items1)
//           const prev2 = last(items2)
//           const prev3 = last(items3)
//           const n1 = await create(ipfs, log1._identity, 'X', 'entryA' + i, [prev1])
//           const n2 = await create(ipfs, log2._identity, 'X', 'entryB' + i, [prev2, n1])
//           const n3 = await create(ipfs, log3._identity, 'X', 'entryC' + i, [prev3, n1, n2])
//           items1.push(n1)
//           items2.push(n2)
//           items3.push(n3)
//         }

//         const a = await fromEntry(ipfs, testIdentity, last(items1),
//           { length: amount })
//         strictEqual(a.length, amount)

//         const b = await fromEntry(ipfs, testIdentity2, last(items2),
//           { length: amount * 2 })
//         strictEqual(b.length, amount * 2)

//         const c = await fromEntry(ipfs, testIdentity3, last(items3),
//           { length: amount * 3 })
//         strictEqual(c.length, amount * 3)
//       })

//       it('retrieves full log from an entry hash 3', async () => {
//         const log1 = await Log(testIdentity, { logId: 'X' })
//         const log2 = await Log(testIdentity2, { logId: 'X' })
//         const log3 = await Log(testIdentity4, { logId: 'X' })
//         const items1 = []
//         const items2 = []
//         const items3 = []
//         const amount = 10
//         for (let i = 1; i <= amount; i++) {
//           const prev1 = last(items1)
//           const prev2 = last(items2)
//           const prev3 = last(items3)
//           log1.clock().tick()
//           log2.clock().tick()
//           log3.clock().tick()
//           const n1 = await create(ipfs, log1._identity, 'X', 'entryA' + i, [prev1], log1.clock())
//           const n2 = await create(ipfs, log2._identity, 'X', 'entryB' + i, [prev2, n1], log2.clock())
//           const n3 = await create(ipfs, log3._identity, 'X', 'entryC' + i, [prev3, n1, n2], log3.clock())
//           log1.clock().merge(log2.clock())
//           log1.clock().merge(log3.clock())
//           log2.clock().merge(log1.clock())
//           log2.clock().merge(log3.clock())
//           log3.clock().merge(log1.clock())
//           log3.clock().merge(log2.clock())
//           items1.push(n1)
//           items2.push(n2)
//           items3.push(n3)
//         }

//         const a = await fromEntry(ipfs, testIdentity, last(items1),
//           { length: amount })
//         strictEqual(a.length, amount)

//         const itemsInB = [
//           'entryA1',
//           'entryB1',
//           'entryA2',
//           'entryB2',
//           'entryA3',
//           'entryB3',
//           'entryA4',
//           'entryB4',
//           'entryA5',
//           'entryB5',
//           'entryA6',
//           'entryB6',
//           'entryA7',
//           'entryB7',
//           'entryA8',
//           'entryB8',
//           'entryA9',
//           'entryB9',
//           'entryA10',
//           'entryB10'
//         ]

//         const b = await fromEntry(ipfs, testIdentity2, last(items2),
//           { length: amount * 2 })
//         strictEqual(b.length, amount * 2)
//         deepStrictEqual(b.values.map((e) => e.payload), itemsInB)

//         const c = await fromEntry(ipfs, testIdentity4, last(items3),
//           { length: amount * 3 })
//         await c.append('EOF')
//         strictEqual(c.length, amount * 3 + 1)

//         const tmp = [
//           'entryA1',
//           'entryB1',
//           'entryC1',
//           'entryA2',
//           'entryB2',
//           'entryC2',
//           'entryA3',
//           'entryB3',
//           'entryC3',
//           'entryA4',
//           'entryB4',
//           'entryC4',
//           'entryA5',
//           'entryB5',
//           'entryC5',
//           'entryA6',
//           'entryB6',
//           'entryC6',
//           'entryA7',
//           'entryB7',
//           'entryC7',
//           'entryA8',
//           'entryB8',
//           'entryC8',
//           'entryA9',
//           'entryB9',
//           'entryC9',
//           'entryA10',
//           'entryB10',
//           'entryC10',
//           'EOF'
//         ]
//         deepStrictEqual(c.values.map(e => e.payload), tmp)

//         // make sure logX comes after A, B and C
//         const logX = await Log(testIdentity4, { logId: 'X' })
//         await logX.append('1')
//         await logX.append('2')
//         await logX.append('3')
//         const d = await fromEntry(ipfs, testIdentity3, last(logX.values),
//           { length: -1 })

//         await c.join(d)
//         await d.join(c)

//         await c.append('DONE')
//         await d.append('DONE')
//         const f = await fromEntry(ipfs, testIdentity3, last(c.values),
//           { amount: -1, exclude: [] })
//         const g = await fromEntry(ipfs, testIdentity3, last(d.values),
//           { length: -1, exclude: [] })

//         strictEqual(f.toString(), bigLogString)
//         strictEqual(g.toString(), bigLogString)
//       })

//       it('retrieves full log of randomly joined log', async () => {
//         const log1 = await Log(testIdentity, { logId: 'X' })
//         const log2 = await Log(testIdentity3, { logId: 'X' })
//         const log3 = await Log(testIdentity4, { logId: 'X' })

//         for (let i = 1; i <= 5; i++) {
//           await log1.append('entryA' + i)
//         }

//         for (let i = 1; i <= 5; i++) {
//           await log2.append('entryB' + i)
//         }

//         await log3.join(log1)
//         await log3.join(log2)

//         for (let i = 6; i <= 10; i++) {
//           await log1.append('entryA' + i)
//         }

//         await log1.join(log3)

//         for (let i = 11; i <= 15; i++) {
//           await log1.append('entryA' + i)
//         }

//         const expectedData = [
//           'entryA1', 'entryB1', 'entryA2', 'entryB2',
//           'entryA3', 'entryB3', 'entryA4', 'entryB4',
//           'entryA5', 'entryB5',
//           'entryA6', 'entryA7', 'entryA8', 'entryA9', 'entryA10',
//           'entryA11', 'entryA12', 'entryA13', 'entryA14', 'entryA15'
//         ]

//         deepStrictEqual(log1.values.map(e => e.payload), expectedData)
//       })

//       it('retrieves randomly joined log deterministically', async () => {
//         const logA = await Log(testIdentity, { logId: 'X' })
//         const logB = await Log(testIdentity3, { logId: 'X' })
//         const log3 = await Log(testIdentity4, { logId: 'X' })
//         const log = await Log(testIdentity2, { logId: 'X' })

//         for (let i = 1; i <= 5; i++) {
//           await logA.append('entryA' + i)
//         }

//         for (let i = 1; i <= 5; i++) {
//           await logB.append('entryB' + i)
//         }

//         await log3.join(logA)
//         await log3.join(logB)

//         for (let i = 6; i <= 10; i++) {
//           await logA.append('entryA' + i)
//         }

//         await log.join(log3)
//         await log.append('entryC0')
//         await log.join(logA, 16)

//         const expectedData = [
//           'entryA1', 'entryB1', 'entryA2', 'entryB2',
//           'entryA3', 'entryB3', 'entryA4', 'entryB4',
//           'entryA5', 'entryB5',
//           'entryA6',
//           'entryC0', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(log.values.map(e => e.payload), expectedData)
//       })

//       it('sorts', async () => {
//         const testLog = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const log = testLog.log
//         const expectedData = testLog.expectedData

//         const expectedData2 = [
//           'entryA1', 'entryB1', 'entryA2', 'entryB2',
//           'entryA3', 'entryB3', 'entryA4', 'entryB4',
//           'entryA5', 'entryB5',
//           'entryA6', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         const expectedData3 = [
//           'entryA1', 'entryB1', 'entryA2', 'entryB2',
//           'entryA3', 'entryB3', 'entryA4', 'entryB4',
//           'entryA5', 'entryB5', 'entryA6', 'entryC0',
//           'entryA7', 'entryA8', 'entryA9'
//         ]

//         const expectedData4 = [
//           'entryA1', 'entryB1', 'entryA2', 'entryB2',
//           'entryA3', 'entryB3', 'entryA4', 'entryB4',
//           'entryA5', 'entryA6', 'entryC0', 'entryA7',
//           'entryA8', 'entryA9', 'entryA10'
//         ]

//         const fetchOrder = log.values.slice().sort(compare)
//         deepStrictEqual(fetchOrder.map(e => e.payload), expectedData)

//         const reverseOrder = log.values.slice().reverse().sort(compare)
//         deepStrictEqual(fetchOrder, reverseOrder)

//         const hashOrder = log.values.slice().sort((a, b) => a.hash > b.hash).sort(compare)
//         deepStrictEqual(fetchOrder, hashOrder)

//         const randomOrder2 = log.values.slice().sort((a, b) => 0.5 - Math.random()).sort(compare)
//         deepStrictEqual(fetchOrder, randomOrder2)

//         // partial data
//         const partialLog = log.values.filter(e => e.payload !== 'entryC0').sort(compare)
//         deepStrictEqual(partialLog.map(e => e.payload), expectedData2)

//         const partialLog2 = log.values.filter(e => e.payload !== 'entryA10').sort(compare)
//         deepStrictEqual(partialLog2.map(e => e.payload), expectedData3)

//         const partialLog3 = log.values.filter(e => e.payload !== 'entryB5').sort(compare)
//         deepStrictEqual(partialLog3.map(e => e.payload), expectedData4)
//       })

//       it('sorts deterministically from random order', async () => {
//         const testLog = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const log = testLog.log
//         const expectedData = testLog.expectedData

//         const fetchOrder = log.values.slice().sort(compare)
//         deepStrictEqual(fetchOrder.map(e => e.payload), expectedData)

//         let sorted
//         for (let i = 0; i < 1000; i++) {
//           const randomOrder = log.values.slice().sort((a, b) => 0.5 - Math.random())
//           sorted = randomOrder.sort(compare)
//           deepStrictEqual(sorted.map(e => e.payload), expectedData)
//         }
//       })

//       it('sorts entries correctly', async () => {
//         const testLog = await createLogWithTwoHundredEntries(Log, ipfs, identities)
//         const log = testLog.log
//         const expectedData = testLog.expectedData
//         deepStrictEqual(log.values.map(e => e.payload), expectedData)
//       })

//       it('sorts entries according to custom tiebreaker function', async () => {
//         const testLog = await createLogWithSixteenEntries(Log, ipfs, identities)

//         const firstWriteWinsLog =
//           Log(identities[0], { logId: 'X', sortFn: FirstWriteWins })
//         await firstWriteWinsLog.join(testLog.log)
//         deepStrictEqual(firstWriteWinsLog.values.map(e => e.payload),
//           firstWriteExpectedData)
//       })

//       it('throws an error if the tiebreaker returns zero', async () => {
//         const testLog = await createLogWithSixteenEntries(Log, ipfs, identities)
//         const firstWriteWinsLog =
//           Log(identities[0], { logId: 'X', sortFn: BadComparatorReturnsZero })
//         await firstWriteWinsLog.join(testLog.log)
//         throws(() => firstWriteWinsLog.values, Error, 'Error Thrown')
//       })

//       it('retrieves partially joined log deterministically - single next pointer', async () => {
//         const nextPointerAmount = 1

//         const logA = await Log(testIdentity, { logId: 'X' })
//         const logB = await Log(testIdentity3, { logId: 'X' })
//         const log3 = await Log(testIdentity4, { logId: 'X' })
//         const log = await Log(testIdentity2, { logId: 'X' })

//         for (let i = 1; i <= 5; i++) {
//           await logA.append('entryA' + i, nextPointerAmount)
//         }

//         for (let i = 1; i <= 5; i++) {
//           await logB.append('entryB' + i, nextPointerAmount)
//         }

//         await log3.join(logA)
//         await log3.join(logB)

//         for (let i = 6; i <= 10; i++) {
//           await logA.append('entryA' + i, nextPointerAmount)
//         }

//         await log.join(log3)
//         await log.append('entryC0', nextPointerAmount)

//         await log.join(logA)

//         const hash = await log.toMultihash()

//         // First 5
//         let res = await _fromMultihash(ipfs, testIdentity2, hash, { length: 5 })

//         const first5 = [
//           'entryC0', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(res.values.map(e => e.payload), first5)

//         // First 11
//         res = await _fromMultihash(ipfs, testIdentity2, hash, { length: 11 })

//         const first11 = [
//           'entryB3', 'entryA4', 'entryB4',
//           'entryA5', 'entryB5',
//           'entryA6',
//           'entryC0', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(res.values.map(e => e.payload), first11)

//         // All but one
//         res = await _fromMultihash(ipfs, testIdentity2, hash, { length: 16 - 1 })

//         const all = [
//           /* excl */ 'entryB1', 'entryA2', 'entryB2', 'entryA3', 'entryB3',
//           'entryA4', 'entryB4', 'entryA5', 'entryB5',
//           'entryA6',
//           'entryC0', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(res.values.map(e => e.payload), all)
//       })

//       it('retrieves partially joined log deterministically - multiple next pointers', async () => {
//         const nextPointersAmount = 64

//         const logA = await Log(testIdentity, { logId: 'X' })
//         const logB = await Log(testIdentity3, { logId: 'X' })
//         const log3 = await Log(testIdentity4, { logId: 'X' })
//         const log = await Log(testIdentity2, { logId: 'X' })

//         for (let i = 1; i <= 5; i++) {
//           await logA.append('entryA' + i, nextPointersAmount)
//         }

//         for (let i = 1; i <= 5; i++) {
//           await logB.append('entryB' + i, nextPointersAmount)
//         }

//         await log3.join(logA)
//         await log3.join(logB)

//         for (let i = 6; i <= 10; i++) {
//           await logA.append('entryA' + i, nextPointersAmount)
//         }

//         await log.join(log3)
//         await log.append('entryC0', nextPointersAmount)

//         await log.join(logA)

//         const hash = await log.toMultihash()

//         // First 5
//         let res = await _fromMultihash(ipfs, testIdentity2, hash, { length: 5 })

//         const first5 = [
//           'entryC0', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(res.values.map(e => e.payload), first5)

//         // First 11
//         res = await _fromMultihash(ipfs, testIdentity2, hash, { length: 11 })

//         const first11 = [
//           'entryB3', 'entryA4', 'entryB4', 'entryA5',
//           'entryB5', 'entryA6',
//           'entryC0',
//           'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(res.values.map(e => e.payload), first11)

//         // All but one
//         res = await _fromMultihash(ipfs, testIdentity2, hash, { length: 16 - 1 })

//         const all = [
//           /* excl */ 'entryB1', 'entryA2', 'entryB2', 'entryA3', 'entryB3',
//           'entryA4', 'entryB4', 'entryA5', 'entryB5',
//           'entryA6',
//           'entryC0', 'entryA7', 'entryA8', 'entryA9', 'entryA10'
//         ]

//         deepStrictEqual(res.values.map(e => e.payload), all)
//       })

//       it('throws an error if ipfs is not defined', async () => {
//         let err
//         try {
//           await fromEntry()
//         } catch (e) {
//           err = e
//         }
//         notStrictEqual(err, null)
//         strictEqual(err.message, 'IPFS instance not defined')
//       })

//       describe('fetches a log', () => {
//         const amount = 100
//         let items1 = []
//         let items2 = []
//         let items3 = []
//         let log1, log2, log3

//         beforeEach(async () => {
//           const ts = new Date().getTime()
//           log1 = await Log(testIdentity, { logId: 'X' })
//           log2 = await Log(testIdentity2, { logId: 'X' })
//           log3 = await Log(testIdentity3, { logId: 'X' })
//           items1 = []
//           items2 = []
//           items3 = []
//           for (let i = 1; i <= amount; i++) {
//             const prev1 = last(items1)
//             const prev2 = last(items2)
//             const prev3 = last(items3)
//             const n1 = await create(ipfs, log1._identity, log1.id, 'entryA' + i + '-' + ts, [prev1], log1.clock())
//             const n2 = await create(ipfs, log2._identity, log2.id, 'entryB' + i + '-' + ts, [prev2, n1], log2.clock())
//             const n3 = await create(ipfs, log3._identity, log3.id, 'entryC' + i + '-' + ts, [prev3, n1, n2], log3.clock())
//             log1.clock().tick()
//             log2.clock().tick()
//             log3.clock().tick()
//             log1.clock().merge(log2.clock())
//             log1.clock().merge(log3.clock())
//             log2.clock().merge(log1.clock())
//             log2.clock().merge(log3.clock())
//             log3.clock().merge(log1.clock())
//             log3.clock().merge(log2.clock())
//             items1.push(n1)
//             items2.push(n2)
//             items3.push(n3)
//           }
//         })

//         it('returns all entries - no excluded entries', async () => {
//           const a = await fromEntry(ipfs, testIdentity, last(items1),
//             { length: -1 })
//           strictEqual(a.length, amount)
//           strictEqual(a.values[0].hash, items1[0].hash)
//         })

//         it('returns all entries - including excluded entries', async () => {
//           // One entry
//           const a = await fromEntry(ipfs, testIdentity, last(items1),
//             { length: -1, exclude: [items1[0]] })
//           strictEqual(a.length, amount)
//           strictEqual(a.values[0].hash, items1[0].hash)

//           // All entries
//           const b = await fromEntry(ipfs, testIdentity, last(items1),
//             { length: -1, exclude: items1 })
//           strictEqual(b.length, amount)
//           strictEqual(b.values[0].hash, items1[0].hash)
//         })

//         it('respects timeout parameter', async () => {
//           const e = last(items1)
//           e.hash = 'zdpuAwNuRc2Kc1aNDdcdSWuxfNpHRJQw8L8APBNHCEFXbogus'
//           const timeout = 500
//           const st = new Date().getTime()
//           const log = await fromEntry(ipfs, testIdentity, e, { timeout })
//           const et = new Date().getTime()
//           strictEqual((et - st) >= (timeout - 10), true, '' + (et - st) + ' should be greater than timeout ' + timeout)
//           strictEqual(log.length, 1)
//           deepStrictEqual(log.values.map(e => e.payload), [e.payload])
//         })
//       })
//     })
//   })
// })
