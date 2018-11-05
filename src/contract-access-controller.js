'use strict'
const AccessController = require('./access-controller')
const ContractAPI = require('./contract-api')
const prefix = 'contract'

class ContractAccessController extends AccessController {
  constructor(acParameters) {
    super()
    this.contractAPI = new ContractAPI(acParameters.web3, acParameters.abi, acParameters.contractAddress, acParameters.primaryAccount)
  }

  async canAppend (entry, identityProvider) {
   //TODO verify identity with identityProvider
    return await this.contractAPI.canAppend(entry.identity.id)
  }

  load() {
    this.contractAPI.connectToContract()
  }

  async save() {
    return prefix.concat('/', this.address)
  }

  async add(capability, identifier) {
    return await this.contractAPI.add(identifier, capability)
  }

  async remove(capability, identifier) {
    return await this.contractAPI.remove(identifier, capability)
  }
}

module.exports = ContractAccessController
