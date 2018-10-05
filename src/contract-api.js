'use strict'

class ContractAPI {
    constructor(web3, abi, address, primaryAccount) {
      this.web3 = web3
      this.abi = abi
      this.address = address
      this.primaryAccount = primaryAccount
  }

  connectToContract() {
    this.contract = new this.web3.eth.Contract(this.abi, this.address)
    // this.contract.deploy()
  }

  async canAppend(identifier) {
    return await this.contract.methods.isPermitted(identifier, this.web3.utils.fromAscii('write')).call()
  }

  async add(identifier, capability) {
    return await this.contract.methods.grantCapability(identifier, this.web3.utils.fromAscii(capability)).send( { from: this.primaryAccount } )
  }

  async remove(identifier, capability) {
    return await this.contract.methods.revokeCapability(identifier, this.web3.utils.fromAscii(capability)).send( { from: this.primaryAccount } )
  }
}

module.exports = ContractAPI
