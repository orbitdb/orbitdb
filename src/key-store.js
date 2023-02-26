import * as crypto from '@libp2p/crypto'
import secp256k1 from 'secp256k1'
import { Buffer } from 'safe-buffer'
import LevelStorage from './storage/level.js'
import LRUStorage from './storage/lru.js'
import pkg from 'elliptic'
const { ec: EC } = pkg

const ec = new EC('secp256k1')
const unmarshal = crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey

const verifySignature = async (signature, publicKey, data) => {
  const unmarshalPubKey = crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PublicKey

  if (!signature) {
    throw new Error('No signature given')
  }
  if (!publicKey) {
    throw new Error('Given publicKey was undefined')
  }
  if (!data) {
    throw new Error('Given input data was undefined')
  }

  if (!Buffer.isBuffer(data)) {
    data = Buffer.from(data)
  }

  const isValid = (key, msg, sig) => key.verify(msg, sig)

  let res = false
  try {
    const pubKey = unmarshalPubKey(Buffer.from(publicKey, 'hex'))
    res = await isValid(pubKey, data, Buffer.from(signature, 'hex'))
  } catch (e) {
    // Catch error: sig length wrong
  }
  return Promise.resolve(res)
}

const sign = async (key, data) => {
  if (!key) {
    throw new Error('No signing key given')
  }

  if (!data) {
    throw new Error('Given input data was undefined')
  }

  if (!Buffer.isBuffer(data)) {
    data = Buffer.from(data)
  }

  return Buffer.from(await key.sign(data)).toString('hex')
}

const verify = async (signature, publicKey, data) => {
  // const cached = verifiedCache.get(signature)
  const cached = null
  let res = false
  if (!cached) {
    const verified = await verifySignature(signature, publicKey, data)
    res = verified
    // if (verified) {
    //   verifiedCache.set(signature, { publicKey, data })
    // }
  } else {
    const compare = (cached, data) => {
      // let match
      // if (v === 'v0') {
      //   match = Buffer.compare(Buffer.alloc(30, cached), Buffer.alloc(30, data)) === 0
      // } else {
      const match = Buffer.isBuffer(data) ? Buffer.compare(cached, data) === 0 : cached === data
      // }
      return match
    }
    res = cached.publicKey === publicKey && compare(cached.data, data)
  }
  return res
}

// const verifiedCache = new LRU(1000)

const KeyStore = async ({ storage, cache } = {}) => {
  storage = storage || await LevelStorage()
  cache = cache || await LRUStorage()

  const close = async () => {
    if (!storage) return
    await storage.close()
  }

  const clear = async () => {
    if (!storage) return
    await storage.clear()
    await cache.clear()
  }

  const hasKey = async (id) => {
    if (!id) {
      throw new Error('id needed to check a key')
    }
    if (storage.status && storage.status !== 'open') {
      return null
    }

    let hasKey = false
    try {
      const storedKey = await cache.get(id) || await storage.get(id)
      hasKey = storedKey !== undefined && storedKey !== null
    } catch (e) {
      // Catches 'Error: ENOENT: no such file or directory, open <path>'
      console.error('Error: ENOENT: no such file or directory')
    }

    return hasKey
  }

  const addKey = async (id, key) => {
    try {
      await storage.put(id, JSON.stringify(key))
    } catch (e) {
      console.log(e)
    }
    cache.put(id, key)
  }

  const createKey = async (id, { entropy } = {}) => {
    if (!id) {
      throw new Error('id needed to create a key')
    }
    // if (storage.status && storage.status !== 'open') {
    //   console.log("22::", id)
    //   return null
    // }

    // Generate a private key
    const privKey = ec.genKeyPair({ entropy }).getPrivate().toArrayLike(Buffer)
    // Left pad the key to 32 bytes. The module used in libp2p crypto (noble-secp256k1)
    // verifies the length and will throw an error if key is not 32 bytes.
    // For more details on why the generated key is not always 32 bytes, see:
    // https://stackoverflow.com/questions/62938091/why-are-secp256k1-privatekeys-not-always-32-bytes-in-nodejs
    const buf = Buffer.alloc(32)
    // Copy the private key buffer to the padded buffer
    privKey.copy(buf, buf.length - privKey.length)

    const keys = await unmarshal(buf)
    const pubKey = keys.public.marshal()
    const decompressedKey = secp256k1.publicKeyConvert(Buffer.from(pubKey), false)
    const key = {
      publicKey: Buffer.from(decompressedKey).toString('hex'),
      privateKey: Buffer.from(keys.marshal()).toString('hex')
    }

    try {
      await storage.put(id, JSON.stringify(key))
    } catch (e) {
      console.log(e)
    }
    cache.put(id, key)

    return keys
  }

  const getKey = async (id) => {
    if (!id) {
      throw new Error('id needed to get a key')
    }
    if (storage.status && storage.status !== 'open') {
      return null
    }

    const cachedKey = await cache.get(id)
    let storedKey
    try {
      storedKey = cachedKey || await storage.get(id)
    } catch (e) {
      // ignore ENOENT error
    }

    if (!storedKey) {
      return
    }

    const deserializedKey = cachedKey || JSON.parse(storedKey)
    if (!deserializedKey) {
      return
    }

    if (!cachedKey) {
      cache.put(id, deserializedKey)
    }

    return unmarshal(Buffer.from(deserializedKey.privateKey, 'hex'))
  }

  const getPublic = (keys, options = {}) => {
    const formats = ['hex', 'buffer']
    const decompress = typeof options.decompress === 'undefined' ? true : options.decompress
    const format = options.format || 'hex'
    if (formats.indexOf(format) === -1) {
      throw new Error('Supported formats are `hex` and `buffer`')
    }
    let pubKey = keys.public.marshal()
    if (decompress) {
      pubKey = secp256k1.publicKeyConvert(Buffer.from(pubKey), false)
    }
    pubKey = Buffer.from(pubKey)
    return format === 'buffer' ? pubKey : pubKey.toString('hex')
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
  verify,
  sign
}
