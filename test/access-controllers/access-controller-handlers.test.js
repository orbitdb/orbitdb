// import assert from 'assert'
// import rmrf from 'rimraf'
// // import Web3 from 'web3'
// import OrbitDB from '../../src/OrbitDB.js'
//
// // import IdentityProvider from 'orbit-db-identity-provider'
// import Keystore from '../../src/key-store.js'
// import AccessControllers from '../../src/access-controllers/index.js'
// // import ContractAccessController from 'orbit-db-access-controllers/contract'
// // import ganache from 'ganache-cli'
// // import Access from './Access.json' assert {type: "json"}
// import config from '../config.js'
// import connectPeers from '../utils/connect-nodes.js'
//
// const abi = Access.abi
// const bytecode = Access.bytecode
// const dbPath1 = './orbitdb/tests/orbitdb-access-controller/1'
// const dbPath2 = './orbitdb/tests/orbitdb-access-controller/2'
//
// describe('Access Controller Handlers', function () {
//   this.timeout(config.timeout)
//
//   let ipfs1, ipfs2
//   let orbitdb1, orbitdb2
//
//   before(async () => {
//     ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
//     ipfs2 = await IPFS.create({ ...config.daemon2, repo: './ipfs2' })
//     await connectPeers(ipfs1, ipfs2)
//
//     const keystore1 = await Keystore({ path: dbPath1 + '/keys' })
//     const keystore2 = await Keystore({ path: dbPath2 + '/keys' })
//
//     identities1 = await Identities({ keystore: keystore1 })
//     identities2 = await Identities({ keystore: keystore2 })
//
//     testIdentity1 = await identities1.createIdentity({ id: 'userA' })
//     testIdentity2 = await identities2.createIdentity({ id: 'userB' })
//
//     orbitdb1 = await OrbitDB({ ipfs: ipfs1, identity: testIdentity1, directory: dbPath1 })
//     orbitdb2 = await OrbitDB({ ipfs: ipfs2, identity: testIdentity2, directory: dbPath2 })
//   })
//
//   after(async () => {
//     if (orbitdb1) {
//       await orbitdb1.stop()
//     }
//
//     if (orbitdb2) {
//       await orbitdb2.stop()
//     }
//
//     if (ipfs1) {
//       await ipfs1.stop()
//     }
//
//     if (ipfs2) {
//       await ipfs2.stop()
//     }
//
//     await rmrf('./orbitdb')
//     await rmrf('./ipfs1')
//     await rmrf('./ipfs2')
//   })
//
//   describe.only('isSupported', function () {
//     it('supports default access controllers', () => {
//       assert.strictEqual(AccessControllers.isSupported('ipfs'), true)
//       assert.strictEqual(AccessControllers.isSupported('orbitdb'), true)
//     })
//
//     it('doesn\'t support smart contract access controller by default', () => {
//       assert.strictEqual(AccessControllers.isSupported(ContractAccessController.type), false)
//     })
//   })
//
//   // describe('addAccessController', function () {
//   //   it('supports added access controller', () => {
//   //     const options = {
//   //       AccessController: ContractAccessController,
//   //       web3: web3,
//   //       abi: abi
//   //     }
//   //     AccessControllers.addAccessController(options)
//   //     assert.strictEqual(AccessControllers.isSupported(ContractAccessController.type), true)
//   //   })
//   // })
//   //
//   // describe('create access controllers', function () {
//   //   let options = {
//   //     AccessController: ContractAccessController
//   //   }
//   //
//   //   before(async () => {
//   //     web3 = new Web3(ganache.provider())
//   //     const accounts = await web3.eth.getAccounts()
//   //     contract = await new web3.eth.Contract(abi)
//   //       .deploy({ data: bytecode })
//   //       .send({ from: accounts[0], gas: '1000000' })
//   //     options = Object.assign({}, options, { web3, abi, contractAddress: contract._address, defaultAccount: accounts[0] })
//   //     AccessControllers.addAccessController(options)
//   //   })
//   //
//   //   it('throws an error if AccessController is not defined', async () => {
//   //     let err
//   //     try {
//   //       AccessControllers.addAccessController({})
//   //     } catch (e) {
//   //       err = e.toString()
//   //     }
//   //     assert.strictEqual(err, 'Error: AccessController class needs to be given as an option')
//   //   })
//   //
//   //   it('throws an error if AccessController doesn\'t define type', async () => {
//   //     let err
//   //     try {
//   //       AccessControllers.addAccessController({ AccessController: {} })
//   //     } catch (e) {
//   //       err = e.toString()
//   //     }
//   //     assert.strictEqual(err, 'Error: Given AccessController class needs to implement: static get type() { /* return a string */}.')
//   //   })
//   //
//   //   it('creates a custom access controller', async () => {
//   //     const type = ContractAccessController.type
//   //     const acManifestHash = await AccessControllers.create(orbitdb1, type, options)
//   //     assert.notStrictEqual(acManifestHash, null)
//   //
//   //     const ac = await AccessControllers.resolve(orbitdb1, acManifestHash, options)
//   //     assert.strictEqual(ac.type, type)
//   //   })
//   //
//   //   it('removes the custom access controller', async () => {
//   //     AccessControllers.removeAccessController(ContractAccessController.type)
//   //     assert.strictEqual(AccessControllers.isSupported(ContractAccessController.type), false)
//   //   })
//   // })
// })
