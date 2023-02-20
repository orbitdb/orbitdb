import { Level } from 'level'
import * as crypto from '@libp2p/crypto'
import secp256k1 from 'secp256k1'
import LRU from 'lru'
import { Buffer } from 'safe-buffer'
import fs from 'fs'
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

function createStore (path = './keystore') {
  if (fs && fs.mkdirSync) {
    fs.mkdirSync(path, { recursive: true })
  }

  return new Level(path, {})
}

// const verifiedCache = new LRU(1000)

export default class KeyStore {
  constructor (input = {}) {
    if (typeof input === 'string') {
      this._store = createStore(input)
    } else if (typeof input.open === 'function') {
      this._store = input
    } else if (typeof input.store === 'string') {
      this._store = createStore(input.store)
    } else {
      this._store = input.store || createStore()
    }
    this._cache = input.cache || new LRU(100)
  }

  async open () {
    if (!this._store) {
      throw new Error('KeyStore: No store found to open')
    }
    await this._store.open()
  }

  async close () {
    if (!this._store) return
    await this._store.close()
  }

  async hasKey (id) {
    if (!id) {
      throw new Error('id needed to check a key')
    }
    if (this._store.status && this._store.status !== 'open') {
      return null
    }

    let hasKey = false
    try {
      const storedKey = this._cache.get(id) || await this._store.get(id)
      hasKey = storedKey !== undefined && storedKey !== null
    } catch (e) {
      // Catches 'Error: ENOENT: no such file or directory, open <path>'
      console.error('Error: ENOENT: no such file or directory')
    }

    return hasKey
  }

  async addKey (id, key) {
    try {
      await this._store.put(id, JSON.stringify(key))
    } catch (e) {
      console.log(e)
    }
    this._cache.set(id, key)
  }

  async createKey (id, { entropy } = {}) {
    if (!id) {
      throw new Error('id needed to create a key')
    }
    // if (this._store.status && this._store.status !== 'open') {
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
      await this._store.put(id, JSON.stringify(key))
    } catch (e) {
      console.log(e)
    }
    this._cache.set(id, key)

    return keys
  }

  async getKey (id) {
    if (!id) {
      throw new Error('id needed to get a key')
    }
    if (!this._store) {
      await this.open()
    }
    if (this._store.status && this._store.status !== 'open') {
      return null
    }

    const cachedKey = this._cache.get(id)
    let storedKey
    try {
      storedKey = cachedKey || await this._store.get(id)
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
      this._cache.set(id, deserializedKey)
    }

    return unmarshal(Buffer.from(deserializedKey.privateKey, 'hex'))
  }

  getPublic (keys, options = {}) {
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

  static async sign (key, data) {
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

  static async verify (signature, publicKey, data) {
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
}
