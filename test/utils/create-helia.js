import { createHelia } from 'helia'
import { bitswap } from 'helia/block-brokers'
import { createLibp2p } from 'libp2p'
import { DefaultLibp2pOptions, DefaultLibp2pBrowserOptions } from '../../src/index.js'

const isBrowser = () => typeof window !== 'undefined'

export default async () => {
  const options = isBrowser() ? DefaultLibp2pBrowserOptions : DefaultLibp2pOptions

  const libp2p = await createLibp2p({ ...options })

  const heliaOptions = {
    libp2p,
    blockBrokers: [bitswap()]
  }

  return createHelia({ ...heliaOptions })
}
