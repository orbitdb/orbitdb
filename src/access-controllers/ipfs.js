// import * as io from '../utils/index.js'
// import AccessController from './interface.js'
// import AccessControllerManifest from './manifest.js'
import { IPFSBlockStorage } from '../storage/index.js'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const type = 'ipfs'

const AccessControllerManifest = async ({ storage, type, params }) => {
  const manifest = {
    type,
    ...params
  }
  const { cid, bytes } = await Block.encode({ value: manifest, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  await storage.put(hash, bytes)
  return hash
}

const IPFSAccessController = async ({ ipfs, identities, identity, address, storage, write }) => {
  storage = storage || await IPFSBlockStorage({ ipfs, pin: true })

  write = write || [identity.id]

  if (address) {
    const manifestBytes = await storage.get(address)
    const { value } = await Block.decode({ bytes: manifestBytes, codec, hasher })
    write = value.write
    address = await AccessControllerManifest({ storage, type, params: { write } })
  } else {
    address = await AccessControllerManifest({ storage, type, params: { write } })
  }

  const canAppend = async (entry) => {
    const writerIdentity = await identities.getIdentity(entry.identity)
    if (!writerIdentity) {
      return false
    }
    const { id } = writerIdentity
    // Allow if the write access list contain the writer's id or is '*'
    if (write.includes(id) || write.includes('*')) {
      // Check that the identity is valid
      return identities.verifyIdentity(writerIdentity)
    }
    return false
  }

  return {
    address,
    write,
    canAppend
  }
}

export { IPFSAccessController as default }

//   constructor (ipfs, options) {
//     super()
//     this._ipfs = ipfs
//     this._write = Array.from(options.write || [])
//   }

//   // Returns the type of the access controller
//   static get type () { return type }

//   // Return a Set of keys that have `access` capability
//   get write () {
//     return this._write
//   }

//   async canAppend (entry, identityProvider) {
//     // Allow if access list contain the writer's publicKey or is '*'
//     const key = entry.identity.id
//     if (this.write.includes(key) || this.write.includes('*')) {
//       // check identity is valid
//       return identityProvider.verifyIdentity(entry.identity)
//     }
//     return false
//   }

//   async load (address) {
//     // Transform '/ipfs/QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
//     // to 'QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
//     if (address.indexOf('/ipfs') === 0) { address = address.split('/')[2] }

//     try {
//       this._write = await io.read(this._ipfs, address)
//     } catch (e) {
//       console.log('IPFSAccessController.load ERROR:', e)
//     }
//   }

//   async save ({ ipfs }) {
//     let cid
//     try {
//       cid = await io.write(this._ipfs, 'dag-cbor', { write: JSON.stringify(this.write, null, 2) })
//     } catch (e) {
//       console.log('IPFSAccessController.save ERROR:', e)
//     }
//     // return the manifest data
//     return { address: cid }
//   }

//   static async create ({ ipfs, identity }, options = {}) {
//     options = { ...options, ...{ write: options.write || [identity.id] } }
//     return new IPFSAccessController(ipfs, options)
//   }
// }
