import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { DefaultLibp2pOptions, DefaultLibp2pBrowserOptions } from '../../src/index.js'

const isBrowser = () => typeof window !== 'undefined'

export default async () => {
  const options = isBrowser() ? DefaultLibp2pBrowserOptions : DefaultLibp2pOptions

  const libp2p = await createLibp2p({ ...options })

  return createHelia({ libp2p })
}
