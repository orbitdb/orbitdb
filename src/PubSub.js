'use strict';

let messages = {};

class PubSub {
  constructor() {

  }

  static latest(hash) {
    return { head: messages[hash] && messages[hash].length > 0 ? messages[hash][messages[hash].length - 1] : null, modes: {} };
  }

  static publish(hash, message) {
    if(!messages[hash]) messages[hash] = [];
    messages[hash].push(message);
  }

  static delete(hash) {
    messages[hash] = [];
  }

  onNewMessage(channel, message) {
    /*
      // From orbit-server:
      var hash    = req.params.hash;
      var head    = req.body.head;
      if(!head) throw "Invalid request";
      var user    = authorize(req, res);
      var channel = await(Database.getChannel(hash));
      channel.authenticateRead(req.body.password);
      var uid     = await (ipfsAPI.putObject(ipfs, JSON.stringify(user.get())));
      channel.authenticateWrite(uid.Hash);
      await(verifyMessage(head, channel));
      await(channel.updateHead(head))
    */
  }
}

module.exports = PubSub;
