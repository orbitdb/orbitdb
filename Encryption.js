'use strict';

var fs     = require('fs');
var crypto = require('crypto');
var Base58 = require('bs58');

var algorithm     = 'aes-256-ecb';
var useEncryption = true;

/* ENCRYPTION / DECRYPTION */
function encrypt(text, privkey, pubkey) {
  if(!useEncryption)
    return text;

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

function decrypt(text, privkey, pubkey) {
  if(!useEncryption)
    return text;

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

/* SIGNING FUNCTIONS */
function hashWithSHA512(data, salt) {
  if(!salt) salt = "null";
  var hash = crypto.createHmac('sha512', salt);
  hash.update(data);
  var value = hash.digest('hex');
  return value;
}

function sign(data, privkey, seq, salt) {
  if(!salt) salt = "null";
  var sign = crypto.createSign('RSA-SHA256');
  var hash = hashWithSHA512(data, "" + salt)
  sign.update("" + seq + hash);
  var sig = sign.sign(privkey, 'hex');
  return sig;
}

function verify(data, pubkey, sig, seq, salt) {
  if(!salt) salt = "null";
  var verify = crypto.createVerify('RSA-SHA256');
  var hash   = hashWithSHA512(data, salt);
  verify.update("" + seq + hash);
  var verified = verify.verify(pubkey, sig, 'hex');
  return verified;
}

/* PUBLIC */
module.exports = {
  encrypt: function(payload, privkey, pubkey) {
    return encrypt(payload, privkey, pubkey);
  },
  decrypt: function(payload, privkey, pubkey) {
    return decrypt(payload, privkey, pubkey);
  },
  sign: (data, privateKey, sequenceNumber, salt) => {
    return sign(data, privateKey, sequenceNumber, salt);
  },
  verify: (data, publicKey, signature, sequenceNumber, salt) => {
    return verify(data, publicKey, signature, sequenceNumber, salt);
  },
  hash: (data, salt) => {
    return hashWithSHA512(data, salt);
  }
}