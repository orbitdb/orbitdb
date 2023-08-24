/**
* @module KeyStore
* @description
* Provides a local key manager for OrbitDB.
* @example <caption>Create a keystore with defaults.</caption>
* const keystore = await KeyStore()
* @example <caption>Create a keystore with custom storage.</caption>
* const storage = await MemoryStorage()
* const keystore = await KeyStore({ storage })
*/
import * as crypto from '@libp2p/crypto'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { compare as uint8ArrayCompare } from 'uint8arrays/compare'
import ComposedStorage from './storage/composed.js'
import LevelStorage from './storage/level.js'
import LRUStorage from './storage/lru.js'

const unmarshal = crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey
const unmarshalPubKey = crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PublicKey

const verifySignature = async (signature, publicKey, data) => {
  if (!signature) {
    throw new Error('No signature given')
  }
  if (!publicKey) {
    throw new Error('Given publicKey was undefined')
  }
  if (!data) {
    throw new Error('Given input data was undefined')
  }

  if (!(data instanceof Uint8Array)) {
    data = typeof data === 'string' ? uint8ArrayFromString(data) : new Uint8Array(data)
  }

  const isValid = (key, msg, sig) => key.verify(msg, sig)

  let res = false
  try {
    const pubKey = unmarshalPubKey(uint8ArrayFromString(publicKey, 'base16'))
    res = await isValid(pubKey, data, uint8ArrayFromString(signature, 'base16'))
  } catch (e) {
    // Catch error: sig length wrong
  }

  return Promise.resolve(res)
}

/**
 * Signs data using a key pair.
 * @param {Secp256k1PrivateKey} key The key to use for signing data.
 * @param {string|Uint8Array} data The data to sign.
 * @return {string} A signature.
 * @throws No signing key given if no key is provided.
 * @throws Given input data was undefined if no data is provided.
 * @static
 * @private
 */
const signMessage = async (key, data) => {
  if (!key) {
    throw new Error('No signing key given')
  }

  if (!data) {
    throw new Error('Given input data was undefined')
  }

  if (!(data instanceof Uint8Array)) {
    data = typeof data === 'string' ? uint8ArrayFromString(data) : new Uint8Array(data)
  }

  return uint8ArrayToString(await key.sign(data), 'base16')
}

const verifiedCachePromise = LRUStorage({ size: 1000 })

/**
 * Verifies input data against a cached version of the signed message.
 * @param {string} signature The generated signature.
 * @param {string} publicKey The derived public key of the key pair.
 * @param {string} data The data to be verified.
 * @return {boolean} True if the the data and cache match, false otherwise.
 * @static
 * @private
 */
const verifyMessage = async (signature, publicKey, data) => {
  const verifiedCache = await verifiedCachePromise
  const cached = await verifiedCache.get(signature)

  let res = false

  if (!cached) {
    const verified = await verifySignature(signature, publicKey, data)
    res = verified
    if (verified) {
      await verifiedCache.put(signature, { publicKey, data })
    }
  } else {
    const compare = (cached, data) => {
      const match = data instanceof Uint8Array ? uint8ArrayCompare(cached, data) === 0 : cached.toString() === data.toString()
      return match
    }
    res = cached.publicKey === publicKey && compare(cached.data, data)
  }
  return res
}

const defaultPath = './keystore'

/**
 * Creates an instance of KeyStore.
 * @param {Object} params One or more parameters for configuring KeyStore.
 * @param {Object} [params.storage] An instance of a storage class. Can be one
 * of ComposedStorage, IPFSBlockStorage, LevelStorage, etc. Defaults to
 * ComposedStorage.
 * @param {string} [params.path=./keystore] The path to a valid storage.
 * @return {module:KeyStore~KeyStore} An instance of KeyStore.
 * @instance
 */
const KeyStore = async ({ storage, path } = {}) => {
  /**
   * @namespace module:KeyStore~KeyStore
   * @description The instance returned by {@link module:KeyStore}.
   */
  storage = storage || await ComposedStorage(await LRUStorage({ size: 1000 }), await LevelStorage({ path: path || defaultPath }))

  /**
   * Closes the KeyStore's underlying storage.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const close = async () => {
    await storage.close()
  }

  /**
   * Clears the KeyStore's underlying storage.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const clear = async () => {
    await storage.clear()
  }

  /**
   * Checks if a key exists in the key store .
   * @param {string} id The id of an [Identity]{@link module:Identities~Identity} to check the key for.
   * @return {boolean} True if the key exists, false otherwise.
   * @throws id needed to check a key if no id is specified.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const hasKey = async (id) => {
    if (!id) {
      throw new Error('id needed to check a key')
    }

    let hasKey = false
    try {
      const storedKey = await storage.get('private_' + id)
      hasKey = storedKey !== undefined && storedKey !== null
    } catch (e) {
      // Catches 'Error: ENOENT: no such file or directory, open <path>'
      console.error('Error: ENOENT: no such file or directory')
    }

    return hasKey
  }

  /**
   * Adds a private key to the keystore.
   * @param {string} id An id of the [Identity]{@link module:Identities~Identity} to whom the key belongs to.
   * @param {Uint8Array} key The private key to store.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const addKey = async (id, key) => {
    await storage.put('private_' + id, key.privateKey)
  }

  /**
   * Creates a key pair and stores it to the keystore.
   * @param {string} id An id of the [Identity]{@link module:Identities~Identity} to generate the key pair for.
   * @throws id needed to create a key if no id is specified.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const createKey = async (id) => {
    if (!id) {
      throw new Error('id needed to create a key')
    }

    // Generate a private key
    const pair = await crypto.keys.generateKeyPair('secp256k1')
    const keys = await crypto.keys.unmarshalPrivateKey(pair.bytes)
    const pubKey = keys.public.marshal()

    const key = {
      publicKey: pubKey,
      privateKey: keys.marshal()
    }

    await addKey(id, key)

    return keys
  }

  /**
   * Gets a key from keystore.
   * @param {string} id An id of the [Identity]{@link module:Identities~Identity} whose key to retrieve.
   * @return {Uint8Array} The key specified by id.
   * @throws id needed to get a key if no id is specified.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const getKey = async (id) => {
    if (!id) {
      throw new Error('id needed to get a key')
    }

    let storedKey
    try {
      storedKey = await storage.get('private_' + id)
    } catch (e) {
      // ignore ENOENT error
    }

    if (!storedKey) {
      return
    }

    return unmarshal(storedKey)
  }

  /**
   * Gets the serialized public key from a key pair.
   * @param {*} keys A key pair.
   * @param {Object} options One or more options.
   * @param {Object} [options.format=hex] The format the public key should be
   * returned in.
   * @return {Uint8Array|String} The public key.
   * @throws Supported formats are `hex` and `buffer` if an invalid format is
   * passed in options.
   * @memberof module:KeyStore~KeyStore
   * @async
   * @instance
   */
  const getPublic = (keys, options = {}) => {
    const formats = ['hex', 'buffer']
    const format = options.format || 'hex'
    if (formats.indexOf(format) === -1) {
      throw new Error('Supported formats are `hex` and `buffer`')
    }

    const pubKey = keys.public.marshal()

    return format === 'buffer' ? pubKey : uint8ArrayToString(pubKey, 'base16')
  }

  return {
    clear,
    close,
    hasKey,
    addKey,
    createKey,
    getKey,
    getPublic
  }
}

export {
  KeyStore as default,
  verifyMessage,
  signMessage
}
