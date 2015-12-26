// 'use strict';

// var async         = require('asyncawait/async');
// var await         = require('asyncawait/await');
// var ipfsAPI       = require('./ipfs-api-promised');
// var HashCacheItem = require('./HashCacheItem').EncryptedHashCacheItem;
// var MetaInfo      = require('./MetaInfo');
// var ItemTypes      = require('./ItemTypes');
// var Keystore      = require('./Keystore');
// var Post          = require('./Post');
// var encryption    = require('./Encryption');

// var pubkey  = Keystore.getKeys().publicKey;
// var privkey = Keystore.getKeys().privateKey;

// class MessageFactory {

//   static create(text, seq) {
//     // var seq  = this.channels[hash].seq;
//     var size = -1;
//     var metaInfo = new MetaInfo(ItemTypes.Message, size, new Date().getTime());
//     var hcItem   = new HashCacheItem(seq, post.Hash, metaInfo, pubkey, privkey, password);
//     var item     = await (ipfsAPI.putObject(this.ipfs, JSON.stringify(hcItem)));
//     var newHead  = { Hash: item.Hash };

//     if(seq > 0) {
//       var iter     = await (this._iterator(hash, password))
//       var prevHead = iter.next();
//       var headItem = await (ipfsAPI.getObject(this.ipfs, prevHead.hash));
//       seq = JSON.parse(headItem.Data)["seq"] + 1;
//       newHead = await (ipfsAPI.patchObject(this.ipfs, item.Hash, prevHead.hash))
//     }

//     return newHead;
//   }

//   static _publishContent(ipfs, text) {
//     var post = new Post(text);
//     var enc  = MessageFactory._encryptPost(post);
//     var res  = await (ipfsAPI.putObject(ipfs, JSON.stringify(enc)));
//     return res.Hash;
//   }

//   static _encryptPost(post) {
//     return new Post(encryption.encrypt(post.content, privkey, pubkey));
//   }
// }

// module.exports = MessageFactory;