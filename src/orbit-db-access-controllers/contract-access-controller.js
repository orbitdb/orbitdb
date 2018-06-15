'use strict';

const EventEmitter = require('events').EventEmitter;
const AccessController = require('./access-controller');
const { ensureAddress } = require('./utils');

class ContractAccessController extends AccessController {
  constructor(options) {
    super();
    this._contractAPI = options.contractAPI;
    this.controllerType = 'contract';
    this._ipfs = options.ipfs;
    this.keystore = options.keystore;
    this.add('write', '*');
  }

  decorateEntry(entry) {
    return entry;
  }

  verifyEntry(entry) {
    return true;
  }

  verifyPermissions(entry) {
    return true;
  }

  // walletSigningFunction, like ethWallet.signMessage.bind(ethWallet)
  genKey(walletSigningFunction) {
    const chainSig = walletSigningFunction(this.publicKey);
    this.keystore.chainSig = chainSig;
  }

  async close() {}
  async add(capability, key) {
    let answer;
    if (this._contractAPI) {
      answer = await this._contractAPI.add(capability, key);
      let capabilities = new Set(this._capabilities[capability] || []);
      capabilities.add(key);
      this._capabilities[capability] = Array.from(capabilities);
      return answer;
    } else throw new Error('could not contact smart contract');
  }

  get(capability) {
    return this.capabilities[capability];
  }

  async load(address) {
    if (address.indexOf('/contract') === 0) address = address.split('/')[2];

    try {
      const dag = await this._ipfs.object.get(address);
      const obj = JSON.parse(dag.toJSON().data);
      this._capabilities = obj;
    } catch (e) {
      console.log('ACCESS ERROR:', e);
    }
  }

  async save() {
    let hash;
    try {
      const json = JSON.stringify(this._capabilities, null, 2);
      const dag = await this._ipfs.object.put(Buffer.from(json));
      hash = dag.toJSON().multihash.toString();
    } catch (e) {
      console.log('ACCESS ERROR:', e);
    }
    return '/contract/' + hash;
  }

  async remove(capability, key) {
    this._capabilities.delete(key);
  }

  /* Private methods */
  _onUpdate() {
    this.emit('updated');
  }
}

module.exports = ContractAccessController;
