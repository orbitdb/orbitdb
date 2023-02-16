import KeyStore from '../../src/key-store.js'
import { Identities } from '../../src/identities/index.js'
import rimraf from 'rimraf'

const { sync: rmrf } = rimraf

import userA from "./keys/identity-keys/03e0480538c2a39951d054e17ff31fde487cb1031d0044a037b53ad2e028a3e77c.json" assert { type: "json" }
import userB from "./keys/identity-keys/0358df8eb5def772917748fdf8a8b146581ad2041eae48d66cc6865f11783499a6.json" assert { type: "json" }
import userC from "./keys/identity-keys/032f7b6ef0432b572b45fcaf27e7f6757cd4123ff5c5266365bec82129b8c5f214.json" assert { type: "json" }
import userD from "./keys/identity-keys/02a38336e3a47f545a172c9f77674525471ebeda7d6c86140e7a778f67ded92260.json" assert { type: "json" }

import userA_ from "./keys/signing-keys/userA.json" assert { type: "json" }
import userB_ from "./keys/signing-keys/userB.json" assert { type: "json" }
import userC_ from "./keys/signing-keys/userC.json" assert { type: "json" }
import userD_ from "./keys/signing-keys/userD.json" assert { type: "json" }

const identityKeys = {
  '03e0480538c2a39951d054e17ff31fde487cb1031d0044a037b53ad2e028a3e77c': userA,
  '0358df8eb5def772917748fdf8a8b146581ad2041eae48d66cc6865f11783499a6': userB,
  '032f7b6ef0432b572b45fcaf27e7f6757cd4123ff5c5266365bec82129b8c5f214': userC,
  '02a38336e3a47f545a172c9f77674525471ebeda7d6c86140e7a778f67ded92260': userD,
}

const signingKeys = {
  userA: userA_,
  userB: userB_,
  userC: userC_,
  userD: userD_,
}

const createTestIdentities = async (ipfs1, ipfs2) => {
  rmrf('./keys_1')
  rmrf('./keys_2')

  const keystore = new KeyStore('./keys_1')
  await keystore.open()
  for (const [key, value] of Object.entries(identityKeys)) {
    await keystore.addKey(key, value)
  }

  const signingKeyStore = new KeyStore('./keys_2')
  await signingKeyStore.open()
  for (const [key, value] of Object.entries(signingKeys)) {
    await signingKeyStore.addKey(key, value)
  }

  // Create an identity for each peers
  const identities1 = await Identities({ keystore, signingKeyStore, ipfs: ipfs1 })
  const identities2 = await Identities({ keystore, signingKeyStore, ipfs: ipfs2 })
  const testIdentity1 = await identities1.createIdentity({ id: 'userA' })
  const testIdentity2 = await identities2.createIdentity({ id: 'userB' })

  return [[identities1, identities2], [testIdentity1, testIdentity2]]
}

const cleanUpTestIdentities = async (identities) => {
  for (let identity of identities) {
    await identity.keystore.close()
    await identity.signingKeyStore.close()
  }
}

export {
  identityKeys,
  signingKeys,
  createTestIdentities,
  cleanUpTestIdentities
}
