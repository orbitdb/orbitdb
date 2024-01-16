import { createHelia } from 'helia'
import { bitswap } from '@helia/block-brokers'
import { createLibp2p } from 'libp2p'
import { MemoryBlockstore } from 'blockstore-core'
// import { LevelBlockstore } from 'blockstore-level'
import { DefaultLibp2pOptions, DefaultLibp2pBrowserOptions } from '../../src/index.js'

const isBrowser = () => typeof window !== 'undefined'

export default async ({ blockstore } = {}) => {
  const options = isBrowser() ? DefaultLibp2pBrowserOptions : DefaultLibp2pOptions

  const libp2p = await createLibp2p({ ...options })

  blockstore = blockstore || new MemoryBlockstore()

  const heliaOptions = {
    blockstore,
    libp2p,
    blockBrokers: [bitswap()]
  }

  return createHelia({ ...heliaOptions })
}
