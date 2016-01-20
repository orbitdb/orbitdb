'use strict';

var fs     = require('fs');
var crypto = require('crypto');

var algorithm     = 'aes-256-ecb';

class Encryption {
  static encrypt(text, privkey, pubkey) {
    var encrypted;
    try {
      var cipher = crypto.createCipher(algorithm, privkey)
      encrypted  = cipher.update(text, 'utf8', 'hex')
      encrypted  += cipher.final('hex');
    } catch(e) {
      console.log("Error while encrypting:", e, e.stack);
    }
    return encrypted;
  }

  static decrypt(text, privkey, pubkey) {
    var decrypted;
    try {
      var cipher = crypto.createDecipher(algorithm, privkey)
      decrypted  = cipher.update(text, 'hex', 'utf8')
      decrypted  += cipher.final('utf8');
    } catch(e) {
      console.log("Error while decrypting:", e, e.stack);
    }
    return decrypted;
  }

  static hashWithSHA512(data, salt) {
    if(!salt) salt = "null";
    var hash = crypto.createHmac('sha512', salt);
    hash.update(data);
    var value = hash.digest('hex');
    return value;
  }

  static sign(data, privkey, seq, salt) {
    if(!salt) salt = "null";
    var sign = crypto.createSign('RSA-SHA256');
    var hash = Encryption.hashWithSHA512(data, "" + salt)
    sign.update("" + seq + hash);
    var sig = sign.sign(privkey, 'hex');
    return sig;
  }

  static verify(data, pubkey, sig, seq, salt) {
    if(!salt) salt = "null";
    var verify = crypto.createVerify('RSA-SHA256');
    var hash   = Encryption.hashWithSHA512(data, salt);
    verify.update("" + seq + hash);
    var verified = verify.verify(pubkey, sig, 'hex');
    return verified;
  }

}

module.exports = Encryption;
