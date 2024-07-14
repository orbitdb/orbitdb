/*
  Source:
  https://github.com/libp2p/js-libp2p/blob/0b55625d146940994a306101650a55ee58e32f6c/packages/crypto/src/ciphers/aes-gcm.browser.ts

  More information:
  - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
  - https://github.com/bradyjoslin/webcrypto-example/blob/master/script.js
  - https://github.com/mdn/dom-examples/blob/main/web-crypto/encrypt-decrypt/aes-gcm.js
*/

import crypto from 'crypto'
import { concat } from 'uint8arrays/concat'
import { fromString } from 'uint8arrays/from-string'

// Polyfill fix for browsers
const getCrypto = () => {
  if (typeof global.crypto !== 'undefined') {
    return global.crypto
  } else {
    return crypto
  }
}

// WebKit on Linux does not support deriving a key from an empty PBKDF2 key.
// So, as a workaround, we provide the generated key as a constant. We test that
// this generated key is accurate in test/workaround.spec.ts
// Generated via:
// await crypto.subtle.exportKey('jwk',
//   await crypto.subtle.deriveKey(
//     { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 32767, hash: { name: 'SHA-256' } },
//     await crypto.subtle.importKey('raw', new Uint8Array(0), { name: 'PBKDF2' }, false, ['deriveKey']),
//     { name: 'AES-GCM', length: 128 }, true, ['encrypt', 'decrypt'])
// )
export const derivedEmptyPasswordKey = { alg: 'A128GCM', ext: true, k: 'scm9jmO_4BJAgdwWGVulLg', key_ops: ['encrypt', 'decrypt'], kty: 'oct' }

// Based off of code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

export function AES (opts) {
  const algorithm = opts?.algorithm ?? 'AES-GCM'
  let keyLength = opts?.keyLength ?? 16
  const nonceLength = opts?.nonceLength ?? 12
  const digest = opts?.digest ?? 'SHA-256'
  const saltLength = opts?.saltLength ?? 16
  const iterations = opts?.iterations ?? 32767
  // const crypto = webcrypto.get();
  const crypto = getCrypto()
  keyLength *= 8 // Browser crypto uses bits instead of bytes
  /**
     * Uses the provided password to derive a pbkdf2 key. The key
     * will then be used to encrypt the data.
     */
  async function encrypt (data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(saltLength))
    const nonce = crypto.getRandomValues(new Uint8Array(nonceLength))
    const aesGcm = { name: algorithm, iv: nonce }
    if (typeof password === 'string') {
      password = fromString(password)
    }
    let cryptoKey
    if (password.length === 0) {
      cryptoKey = await crypto.subtle.importKey('jwk', derivedEmptyPasswordKey, { name: 'AES-GCM' }, true, ['encrypt'])
      try {
        const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
        const runtimeDerivedEmptyPassword = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey'])
        cryptoKey = await crypto.subtle.deriveKey(deriveParams, runtimeDerivedEmptyPassword, { name: algorithm, length: keyLength }, true, ['encrypt'])
      } catch {
        cryptoKey = await crypto.subtle.importKey('jwk', derivedEmptyPasswordKey, { name: 'AES-GCM' }, true, ['encrypt'])
      }
    } else {
      // Derive a key using PBKDF2.
      const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
      const rawKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey'])
      cryptoKey = await crypto.subtle.deriveKey(deriveParams, rawKey, { name: algorithm, length: keyLength }, true, ['encrypt'])
    }
    // Encrypt the string.
    const ciphertext = await crypto.subtle.encrypt(aesGcm, cryptoKey, data)
    return concat([salt, aesGcm.iv, new Uint8Array(ciphertext)])
  }
  /**
     * Uses the provided password to derive a pbkdf2 key. The key
     * will then be used to decrypt the data. The options used to create
     * this decryption cipher must be the same as those used to create
     * the encryption cipher.
     */
  async function decrypt (data, password) {
    const salt = data.subarray(0, saltLength)
    const nonce = data.subarray(saltLength, saltLength + nonceLength)
    const ciphertext = data.subarray(saltLength + nonceLength)
    const aesGcm = { name: algorithm, iv: nonce }
    if (typeof password === 'string') {
      password = fromString(password)
    }
    let cryptoKey
    if (password.length === 0) {
      try {
        const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
        const runtimeDerivedEmptyPassword = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey'])
        cryptoKey = await crypto.subtle.deriveKey(deriveParams, runtimeDerivedEmptyPassword, { name: algorithm, length: keyLength }, true, ['decrypt'])
      } catch {
        cryptoKey = await crypto.subtle.importKey('jwk', derivedEmptyPasswordKey, { name: 'AES-GCM' }, true, ['decrypt'])
      }
    } else {
      // Derive the key using PBKDF2.
      const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
      const rawKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey'])
      cryptoKey = await crypto.subtle.deriveKey(deriveParams, rawKey, { name: algorithm, length: keyLength }, true, ['decrypt'])
    }
    // Decrypt the string.
    const plaintext = await crypto.subtle.decrypt(aesGcm, cryptoKey, ciphertext)
    return new Uint8Array(plaintext)
  }
  const cipher = {
    encrypt,
    decrypt
  }
  return cipher
}
