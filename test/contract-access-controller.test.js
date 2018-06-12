'use strict';

const assert = require('assert');
const rmrf = require('rimraf');
const OrbitDB = require('../src/OrbitDB');
const ContractAccessController = require('../src/orbit-db-access-controllers/contract-access-controller');

const { config, startIpfs } = require('./utils');

const dbPath = './orbitdb/tests/contract-access-controller';
const ipfsPath = './orbitdb/tests/contract-access-controller/ipfs';

describe(`smart contract - Write Permissions`, function() {
  this.timeout(20000);
  let ipfs, orbitdb1, orbitdb2;
  class contractAPI {
    constructor(contractAddress) {
      this.contractAddress = contractAddress;
      this._capabilities = {};
      this.blockNumber = 0;
    }
    async add(capability, key) {
      this.blockNumber++;
      let capabilities = new Set(this._capabilities[capability] || []);
      capabilities.add(key);
      this._capabilities[capability] = Array.from(capabilities);

      return this.blockNumber;
    }
  }

  before(async () => {
    config.daemon1.repo = ipfsPath;
    rmrf.sync(config.daemon1.repo);
    rmrf.sync(dbPath);
    ipfs = await startIpfs(config.daemon1);

    orbitdb1 = new OrbitDB(ipfs, dbPath + '/1', {
      contractAPI: new contractAPI('fakeNews'),
    });
    orbitdb2 = new OrbitDB(ipfs, dbPath + '/2', {
      contractAPI: new contractAPI('fakeNews'),
    });
  });

  after(async () => {
    if (orbitdb1) await orbitdb1.stop();

    if (orbitdb2) await orbitdb2.stop();

    if (ipfs) await ipfs.stop();
  });

  describe('Constructor for smart contract access controller', () => {
    let accessController;

    before(() => {
      accessController = new ContractAccessController({
        contractAPI: new contractAPI('fake news'),
      });
    });

    it('creates an access controller', () => {
      assert.notEqual(accessController, null);
    });

    it('has contractAPI instance', async () => {
      assert.notEqual(accessController._contractAPI, null);
    });

    it('sets default capabilities', async () => {
      assert.deepEqual(accessController.capabilities, { write: ['*'] });
    });

    it('sets the controller type', () => {
      assert.equal(accessController.controllerType, 'contract');
    });

    it("Adds '*' to write permissions", () => {
      assert.equal(accessController.get('write')[0], '*');
    });
  });

  describe('Passes down custom decorateEntry and verifyEntry functions', () => {
    it('entries contain extra properties when decorated', async () => {
      const db1 = await orbitdb1.eventlog('replicate-automatically-tests', {
        decorateEntry: entry => {
          entry.chainSig = 'test';
          return entry;
        },
      });
      db1.events.on('write', (dbname, hash, entry) => {
        entry = entry[0];
        try {
          assert.equal(entry.chainSig, 'test');
        } catch (e) {
          console.log(e);
        }
      });
      db1.add('hellothere');
    });
  });

  describe('Starts smart contract controller on startup', () => {
    xit('Fetches permissioned keys on start up', () => {});
    xit('Does not fetch after start up', () => {});
    xit('Listens for smart contract events', () => {});
    xit('Asks user to sign if keystore does not have a chainSignature', () => {});
    xit('Saves keystore to IPFS', () => {});
    xit('Does not ask user to sign a second time', () => {});
  });

  describe('Allows admin to add admins and users to smart contract', () => {
    xit('Allows admin to add admins', () => {});
    xit('Allows admin to add users', () => {});
    xit('Allows admin to remove users', () => {});
  });

  describe('OrbitDB Integration', () => {
    it('saves database manifest file locally', async () => {
      const db = await orbitdb1.feed('AABB', {
        replicate: false,

        accessController: { type: 'contract' },
      });
      const dag = await ipfs.object.get(db.address.root);
      const manifest = JSON.parse(dag.toJSON().data);
      assert.notEqual(manifest);
      assert.equal(manifest.name, 'AABB');
      assert.equal(manifest.type, 'feed');
      assert.notEqual(manifest.accessController, null);
      assert.equal(manifest.accessController.indexOf('/contract'), 0);
    });
  });

  describe('Users can append if added to smart contract', () => {
    let db, db2;
    before(async () => {
      db = await orbitdb1.keyvalue('first', {
        verifyPermissions: () => true,
        accessController: { type: 'contract', ipfs },
      });
    });
    xit('Can write if added', () => {});
    xit('Entry is decorated with chainSignature and chainPublicKey', () => {});
  });

  describe('Controls writing based on access controller verifyPermissions', () => {
    let db, db2;
    before(async () => {
      db = await orbitdb1.keyvalue('first', {
        verifyPermissions: () => true,
        accessController: { type: 'contract', ipfs },
      });

      db2 = await orbitdb1.keyvalue('first', {
        verifyPermissions: () => false,
        accessController: { type: 'contract', ipfs },
      });
    });

    it('Anyone can write if smart contract allows', async () => {
      await db.put('key1', 'hello1');
      const value = db.get('key1');
      assert.equal(value, 'hello1');
    });

    it('Cannot write if smart contract forbids', async () => {
      try {
        await db2.put('key1', 'hello1');
      } catch (e) {
        assert.equal(e, 'Error: Not allowed to write');
      }
      const value = db2.get('key1');
      assert.equal(value, undefined);
    });
  });
});
