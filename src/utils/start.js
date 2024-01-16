import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { LevelBlockstore } from 'blockstore-level'
import { bitswap } from '@helia/block-brokers'
import createOrbitDB from '../orbitdb.js'
import { DefaultLibp2pOptions, DefaultLibp2pBrowserOptions } from '../config/libp2p/index.js'

const isBrowser = () => typeof window !== 'undefined'

/**
 * Start a new OrbitDB peer with a preconfigured Helia instance.
 * @function startOrbitDB
 * @param {Object} params One or more parameters for configuring OrbitDB.
 * @param {IPFS} params.ipfs An IPFS instance.
 * @param {module:Identity|Object} [params.identity] An identity instance or an object containing an Identity Provider instance and any additional params required to create the identity using the specified provider.
 * @param {Function} [params.identity.provider] An initialized identity provider.
 * @param {module:Identities} [params.identities] An Identities system instance.
 * @param {string} [params.directory] A location for storing OrbitDB data.
 * @return {module:OrbitDB~OrbitDB} An instance of OrbitDB.
 * @throws "IPFS instance is required argument" if no IPFS instance is provided.
 * @instance
 */
export default async ({ id, identity, identities, directory } = {}) => {
  const options = isBrowser() ? DefaultLibp2pBrowserOptions : DefaultLibp2pOptions
  const libp2p = await createLibp2p({ ...options })
  directory = directory || '.'
  const blockstore = new LevelBlockstore(`${directory}/ipfs/blocks`)
  const ipfs = await createHelia({ libp2p, blockstore, blockBrokers: [bitswap()] })
  return createOrbitDB({ ipfs, id, identity, identities, directory })
}
