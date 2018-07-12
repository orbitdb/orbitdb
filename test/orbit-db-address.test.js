'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const OrbitDBAddress = require('../src/orbit-db-address')

const dbPath = './orbitdb/tests/orbit-db-address'
const ipfsPath = './orbitdb/tests/orbit-db-address/ipfs'

const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs
} = require('./utils')

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - OrbitDB Address (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb = new OrbitDB(ipfs, dbPath)
    })

    after(async () => {
      if(orbitdb)
        await orbitdb.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)
    })

    describe('Parse Address', () => {
      it('throws an error if address is empty', () => {
        let err
        try {
          const result = OrbitDB.parseAddress('')
        } catch (e) {
          err = e.toString()
        }
        assert.equal(err, 'Error: Not a valid OrbitDB address: ')
      })

      it('parse address successfully', () => {
        const address = '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database'
        const result = OrbitDB.parseAddress(address)

        const isInstanceOf = result instanceof OrbitDBAddress
        assert.equal(isInstanceOf, true)

        assert.equal(result.root, 'Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC')
        assert.equal(result.path, 'first-database')

        assert.equal(result.toString().indexOf('/orbitdb'), 0)
        assert.equal(result.toString().indexOf('Qm'), 9)
      })
    })

    describe('isValid Address', () => {
      it('throws an error if address is empty', () => {
        assert.throws(() => {
          const result = OrbitDB.isValidAddress('')
        })
      })

      it('validate address successfully', () => {
        const address = '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database'
        const result = OrbitDB.isValidAddress(address)

        assert.equal(result, true)
      })

      it('handle missing orbitdb prefix', () => {
        const address = 'Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database'
        const result = OrbitDB.isValidAddress(address)

        assert.equal(result, true)
      })

      it('handle missing db address name', () => {
        const address = '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC'
        const result = OrbitDB.isValidAddress(address)

        assert.equal(result, true)
      })

      it('handle invalid multihash', () => {
        const address = '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzc/first-database'
        const result = OrbitDB.isValidAddress(address)

        assert.equal(result, false)
      })
    })

  })
})
