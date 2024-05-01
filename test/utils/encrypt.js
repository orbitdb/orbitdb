import EthCrypto from 'eth-crypto'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const encrypt = ({ identity }) => async (value) => {
  const encryptedObj = await EthCrypto.encryptWithPublicKey(identity.publicKey, value)
  return EthCrypto.cipher.stringify(encryptedObj)
}

const decrypt = ({ identities, identity }) => async (value) => {
  const privateKey = await identities.keystore.getKey(identity.id)
  const privateKeyStr = uint8ArrayToString(privateKey.marshal(), 'base16')

  const encryptedObj = EthCrypto.cipher.parse(value)
  return await EthCrypto.decryptWithPrivateKey(privateKeyStr, encryptedObj)
}

export {
  encrypt,
  decrypt
}
