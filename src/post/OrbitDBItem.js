'use strict';

const Post = require('./BasePost');

class OrbitDBItem extends Post {
  constructor(operation, key, value) {
    super("orbit-db-op");
    this.op = operation;
    this.key = key;
    this.value = value;
  }
}

/*
class HashCacheItem {
  constructor(operation, key, sequenceNumber, targetHash, metaInfo, next) {
    this.op     = operation;
    this.seq    = sequenceNumber;
    this.key    = key;
    this.target = targetHash;
    this.meta   = metaInfo;
    this.next   = next;
  }
}

class EncryptedHashCacheItem extends HashCacheItem {
  constructor(operation, key, sequenceNumber, targetHash, metaInfo, next, publicKey, privateKey, salt) {
    if(key)
      key = Encryption.encrypt(key, privateKey, publicKey);

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
    let data = JSON.parse(encryptedItem.Data);

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

    if(data.key)
      data.key = Encryption.decrypt(data.key, privateKey, 'TODO: pubkey');

    const item = new HashCacheItem(data.op, data.key, data.seq, data.target, data.meta, next, publicKey, privateKey, salt);
    return item;
  }
}
*/
module.exports = OrbitDBItem;
