'use strict';

var encryption = require('./Encryption');

class HashCacheItem {
  constructor(sequenceNumber, targetHash, metaInfo) {
    this.seq    = sequenceNumber;
    this.target = targetHash;
    this.meta   = metaInfo;
  }
}

class EncryptedHashCacheItem extends HashCacheItem {
  constructor(sequenceNumber, targetHash, metaInfo, publicKey, privateKey, salt) {
    super(sequenceNumber, targetHash, metaInfo, publicKey, privateKey, salt);
    this.pubkey  = publicKey;
    this.target  = encryption.encrypt(targetHash, privateKey, publicKey);
    this.payload = this.target; // old hash-cache api compatibility
    this.meta    = encryption.encrypt(JSON.stringify(metaInfo), privateKey, publicKey);
    try {
      this.sig = encryption.sign(this.target, privateKey, this.seq, salt || "");
    } catch(e) {
      console.log("Signing HashCacheItem failed:", e);
    }
  }
}

module.exports = {
  HashCacheItem: HashCacheItem,
  EncryptedHashCacheItem: EncryptedHashCacheItem
};