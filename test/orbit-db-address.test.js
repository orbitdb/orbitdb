import { strictEqual, notStrictEqual, deepStrictEqual } from 'assert'
import OrbitDBAddress, { isValidAddress, parseAddress } from '../src/address.js'

describe('Address', function () {
  describe('Creating an address from full address string', () => {
    it('creates an address from full address string', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      notStrictEqual(addr, undefined)
    })

    it('has a protocol prefix', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      strictEqual(addr.protocol, 'orbitdb')
    })

    it('has a path', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      strictEqual(addr.hash, 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13')
    })
  })

  describe('Creating an address from hash string', () => {
    it('creates an address', () => {
      const address = 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      notStrictEqual(addr, undefined)
    })

    it('has a protocol prefix', () => {
      const address = 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      strictEqual(addr.protocol, 'orbitdb')
    })

    it('has a path', () => {
      const address = 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      strictEqual(addr.hash, 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13')
    })
  })

  describe('Creating an address from another address', () => {
    const address = 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'

    let addr1, addr2

    before(() => {
      addr1 = OrbitDBAddress(address)
      addr2 = OrbitDBAddress(addr1)
    })

    it('creates an address', () => {
      deepStrictEqual(addr1, addr2)
    })

    it('has a protocol prefix', () => {
      strictEqual(addr2.protocol, 'orbitdb')
    })

    it('has a path', () => {
      strictEqual(addr2.hash, 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13')
    })
  })

  describe('Converting address to a string', () => {
    it('outputs a valid address string', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      const result = addr.toString()
      strictEqual(result, address)
    })
  })

  describe('isValid Address', () => {
    it('is not valid if address is an empty string', () => {
      const result = isValidAddress('')
      strictEqual(result, false)
    })

    it('is a valid address', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const result = isValidAddress(address)
      strictEqual(result, true)
    })

    it('is a valid address if it\'s another instance of OrbitDBAddress', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      const result = isValidAddress(addr)
      strictEqual(result, true)
    })

    it('is not valid address if it\'s missing the /orbitdb prefix', () => {
      const address = 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const result = isValidAddress(address)

      strictEqual(result, false)
    })

    it('is not a valid address if the multihash is invalid - v0', () => {
      const address = '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzc'
      const result = isValidAddress(address)

      strictEqual(result, false)
    })

    it('is not a valid address if the multihash is invalid - v2', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw133333'
      const result = isValidAddress(address)

      strictEqual(result, false)
    })

    it('is a valid address in win32 format', () => {
      const address = '\\orbitdb\\Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC'
      const result = isValidAddress(address)

      strictEqual(result, true)
    })
  })

  describe('Parsing an address', () => {
    it('parses a valid address', () => {
      const address = '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const result = parseAddress(address)

      strictEqual(result.protocol, 'orbitdb')
      strictEqual(result.hash, 'zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13')

      strictEqual(result.toString().indexOf('/orbitdb'), 0)
      strictEqual(result.toString().indexOf('zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'), 9)
    })

    it('parses a valid address in win32 format', () => {
      const address = '\\orbitdb\\Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC'
      const result = parseAddress(address)

      strictEqual(result.protocol, 'orbitdb')
      strictEqual(result.hash, 'Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC')

      strictEqual(result.toString().indexOf('/orbitdb'), 0)
      strictEqual(result.toString().indexOf('Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC'), 9)
    })

    it('throws an error if address is empty', () => {
      let err
      try {
        parseAddress('')
      } catch (e) {
        err = e.toString()
      }
      strictEqual(err, 'Error: Not a valid OrbitDB address: ')
    })

    it('throws an error if address contains too many parts', () => {
      const address = '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzc/this-should-not-be-here'

      let err
      try {
        parseAddress(address)
      } catch (e) {
        err = e
      }

      notStrictEqual(err, undefined)
      strictEqual(err.message, `Not a valid OrbitDB address: ${address}`)
    })
  })
})
