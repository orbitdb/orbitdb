import { startOrbitDB } from '../src/index.js'
import { deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'

describe('Starting OrbitDB', function () {
  it('starts OrbitDB with a preconfigured Helia instance', async () => {
    const orbitdb = await startOrbitDB({ directory: './ipfs' })
    const db1 = await orbitdb.open('db1')
    await db1.add('hello world!')

    deepStrictEqual((await db1.all()).map(e => e.value), ['hello world!'])
    await orbitdb.stop()
    await orbitdb.ipfs.stop()
    await rimraf('./orbitdb')
    await rimraf('./ipfs')
  })
})
