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
    this._capabilities = {};
    this.key = options.key;
    this.add('write', '*');
    this.chainSig = null;
  }

  getPublicSigningKey(format = 'hex') {
    return this.key;
  }

  verify(entry) {
    if (!this.chainSig) {
      this.emit('chainSignature not present', { publicKey: this.key });
      return false;
    }

    return true;
  }

  sign(data) {
      // Verify that we're allowed to write
    if (!this.canAppend(this.getPublicSigningKey('hex')))
      throw new Error("Not allowed to write")

      // sign public key with wallet of contract key
    return 'mysign';
  }

  canAppend(entry) {
    if (!this.chainSig) {
      this.emit('chainSignature not present', { publicKey: this.key });
      return false;
    }

    return true;
  }

  addChainSignature(chainSig) {
    this.chainSig = chainSig;
  }

  // walletSigningFunction, like ethWallet.signMessage.bind(ethWallet)
  genKey(walletSigningFunction) {
    const chainSig = walletSigningFunction(this.publicKey);
    this.chainSig = chainSig;
    this.emit('chainSignature created');
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

  async fetchKeys() {
    const keys = await this._contractAPI.fetchKeys();
    this._capabilities = keys;
  }

  async load(address) {
    if (address.indexOf('/contract') === 0) address = address.split('/')[2];

    try {
      const dag = await this._ipfs.object.get(address);
      const obj = JSON.parse(dag.toJSON().data);
      const { capabilities, chainSig } = obj;
      this._capabilities = capabilities;
      this.chainSig = chainSig;
    } catch (e) {
      console.log('ACCESS ERROR:', e);
    }

    await this.fetchKeys();
  }

  async save() {
    let hash;
    try {
      const data = {
        capabilities: this._capabilities,
        chainSig: this.chainSig,
      };
      const json = JSON.stringify(data, null, 2);
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
