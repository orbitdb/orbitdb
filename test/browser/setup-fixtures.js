import * as crypto from '@libp2p/crypto'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Identities, KeyStore } from '../../src/index.js'

const unmarshal = crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey
const unmarshalPubKey = crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PublicKey

const keysPath = './testkeys'

const isBrowser = () => typeof window !== 'undefined'

// This file will be picked up by webpack into the
// tests bundle and the code here gets run when imported
// into the browser tests index through browser/run.js
before(async () => {
  if (isBrowser()) {
    const keystore = await KeyStore({ path: keysPath })

    const users = [
      {
        id: 'userX',
        privateKey: 'dfe24b20dbcb02217cf0a487f1db3004397160091ba6539dfb8042e94568f47e',
        identity: {
          id: '020863639c1793cdc32abffca1c903f96d282de5530ab3167d661caf96b827369c',
          privateKey: '8b0d3e5ee88edea5314eca1ae8d4f9e276bdc08ac163ba540dc312014b568e37'
        }
      },
      {
        id: 'userB',
        privateKey: '7824c1579131baa6d6c34736b95c596c6c81afdb2f84654228eb2c75403e4c65',
        identity: {
          id: '03c2c4887bb3fbc131f6874959a0fbe646d43a200cf81056e22f9405c1f58ba611',
          privateKey: '4ba52f65ada1d2ca5f70c562202c1a9d9cbef125df78525b0737aff3d13653f4'
        }
      },
      {
        id: 'userC',
        privateKey: '81f78e97259ce190f46141cb5a3d9a9c006557126e8bb752bc78d62d07c1bb3e',
        identity: {
          id: '02c322b7edb44fe8e0f4d8d70feb8a9c30b30721110a355ec9f200b4e49a4637d4',
          privateKey: '0b43ca53b8875baf229faed396f0efdd21498984210bb3f4df04364299ee430b'
        }
      },
      {
        id: 'userA',
        privateKey: '5f74f154ac4591ccf8a67f7edc98971759d684c07f53037ea0d361e2ba3f4683',
        identity: {
          id: '02e7247a4c155b63d182a23c70cb6fe8ba2e44bc9e9d62dc45d4c4167ccde95944',
          privateKey: '5c557f3ca56651e22e68ee770da8e7cc6f12d30081f60a3ca4b5f9f3a9a5f9df'
        }
      },
    ]

    for (let user of users) {
      const privateKey1 = unmarshal(uint8ArrayFromString(user.privateKey, 'base16'))
      const privateKey2 = unmarshal(uint8ArrayFromString(user.identity.privateKey, 'base16'))
      await keystore.addKey(user.id, { privateKey: privateKey1.marshal() })
      await keystore.addKey(user.identity.id, { privateKey: privateKey2.marshal() })
    }

    await keystore.close()
  }
})
