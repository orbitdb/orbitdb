'use strict';

const Encryption = require('orbit-common/lib/Encryption');

const HashCacheOps = {
  Add: "ADD",
  Put: "PUT",
  Delete: "DELETE"
};

class HashCacheItem {
  constructor(operation, key, sequenceNumber, targetHash, metaInfo, next) {
    this.op     = operation;
    this.key    = key;
    this.seq    = sequenceNumber;
    this.target = targetHash;
    this.meta   = metaInfo;
    this.next   = next;
  }
}

class EncryptedHashCacheItem extends HashCacheItem {
  constructor(operation, key, sequenceNumber, targetHash, metaInfo, next, publicKey, privateKey, salt) {
    super(operation, key, sequenceNumber, targetHash, metaInfo, next);
    try {
      this.pubkey = publicKey;
      this.target = Encryption.encrypt(targetHash, privateKey, publicKey);
      this.meta   = Encryption.encrypt(JSON.stringify(metaInfo), privateKey, publicKey);
      this.sig    = Encryption.sign(this.target, privateKey, this.seq, salt || "");
    } catch(e) {
      console.log("Failed to create HashCacheItem:", e);
    }
  }

  static fromEncrypted(encryptedItem, publicKey, privateKey, salt) {
    let data;
    data = JSON.parse(encryptedItem.Data);

    // verify signature
    const verified = Encryption.verify(data.target, data.pubkey, data.sig, data.seq, salt);
    if(!verified) throw "Invalid signature"

    // link to the next item
    const next = encryptedItem.Links[0] ? encryptedItem.Links[0].Hash : null;

    // decrypt data structure
    const targetDec = Encryption.decrypt(data.target, privateKey, 'TODO: pubkey');
    const metaDec   = Encryption.decrypt(data.meta, privateKey, 'TODO: pubkey');
    data.target     = targetDec;
    data.meta       = JSON.parse(metaDec);

    const item = new HashCacheItem(data.op, data.key, data.seq, data.target, data.meta, next, publicKey, privateKey, salt);
    return item;
  }
}

module.exports = {
  HashCacheOps: HashCacheOps,
  HashCacheItem: HashCacheItem,
  EncryptedHashCacheItem: EncryptedHashCacheItem
};
