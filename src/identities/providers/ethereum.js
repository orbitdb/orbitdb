import IdentityProvider from './interface.js'
import { Wallet, verifyMessage } from '@ethersproject/wallet'

const type = 'ethereum'

class EthIdentityProvider extends IdentityProvider {
  constructor ({ wallet } = {}) {
    super()
    this.wallet = wallet
  }

  // Returns the type of the identity provider
  static get type () { return type }

  // Returns the signer's id
  async getId (options = {}) {
    if (!this.wallet) {
      this.wallet = await this._createWallet(options)
    }
    return this.wallet.getAddress()
  }

  // Returns a signature of pubkeysignature
  async signIdentity (data) {
    const wallet = this.wallet

    if (!wallet) {
      throw new Error('wallet is required')
    }

    return wallet.signMessage(data)
  }

  static async verifyIdentity (identity) {
    // Verify that identity was signed by the id
    const signerAddress = verifyMessage(
      identity.publicKey + identity.signatures.id,
      identity.signatures.publicKey
    )
    return (signerAddress === identity.id)
  }

  async _createWallet (options = {}) {
    if (options.mnemonicOpts) {
      if (!options.mnemonicOpts.mnemonic) {
        throw new Error('mnemonic is required')
      }

      const { mnemonic, path, wordlist } = options.mnemonicOpts
      return Wallet.fromMnemonic(mnemonic, path, wordlist)
    }

    if (options.encryptedJsonOpts) {
      if (!options.encryptedJsonOpts.json) {
        throw new Error('encrypted json is required')
      }

      if (!options.encryptedJsonOpts.password) {
        throw new Error('password for encrypted json is required')
      }

      const { json, password, progressCallback } = options.encryptedJsonOpts
      return Wallet.fromEncryptedJson(json, password, progressCallback)
    }

    return Wallet.createRandom()
  }
}

export default EthIdentityProvider
