'use strict'
const AccessController = require('./access-controller')
const prefix = 'contract'

class ContractAccessController extends AccessController {
  constructor(contractAPI) {
    super()
    if (!contractAPI)
      throw new Error('contractAPI is a required argument')
    this.contractAPI = contractAPI
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
