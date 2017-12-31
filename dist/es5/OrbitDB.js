'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var path = require('path');
var EventStore = require('orbit-db-eventstore');
var FeedStore = require('orbit-db-feedstore');
var KeyValueStore = require('orbit-db-kvstore');
var CounterStore = require('orbit-db-counterstore');
var DocumentStore = require('orbit-db-docstore');
var Pubsub = require('orbit-db-pubsub');
var Cache = require('orbit-db-cache');
var Keystore = require('orbit-db-keystore');
var AccessController = require('./ipfs-access-controller');
var OrbitDBAddress = require('./orbit-db-address');
var createDBManifest = require('./db-manifest');

var Logger = require('logplease');
var logger = Logger.create("orbit-db");
Logger.setLogLevel('NONE');

var validTypes = ['eventlog', 'feed', 'docstore', 'counter', 'keyvalue'];

var OrbitDB = function () {
  function OrbitDB(ipfs, directory) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    (0, _classCallCheck3.default)(this, OrbitDB);

    this._ipfs = ipfs;
    this.id = options.peerId || (this._ipfs._peerInfo ? this._ipfs._peerInfo.id._idB58String : 'default');
    this._pubsub = options && options.broker ? new options.broker(this._ipfs) : new Pubsub(this._ipfs, this.id);
    this.stores = {};
    this.types = validTypes;
    this.directory = directory || './orbitdb';
    this.keystore = Keystore.create(path.join(this.directory, this.id, '/keystore'));
    this.key = this.keystore.getKey(this.id) || this.keystore.createKey(this.id);
  }

  /* Databases */


  (0, _createClass3.default)(OrbitDB, [{
    key: 'feed',
    value: async function feed(address) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      options = (0, _assign2.default)({ create: true, type: 'feed' }, options);
      return this.open(address, options);
    }
  }, {
    key: 'log',
    value: async function log(address, options) {
      options = (0, _assign2.default)({ create: true, type: 'eventlog' }, options);
      return this.open(address, options);
    }
  }, {
    key: 'eventlog',
    value: async function eventlog(address) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.log(address, options);
    }
  }, {
    key: 'keyvalue',
    value: async function keyvalue(address, options) {
      options = (0, _assign2.default)({ create: true, type: 'keyvalue' }, options);
      return this.open(address, options);
    }
  }, {
    key: 'kvstore',
    value: async function kvstore(address, options) {
      return this.keyvalue(address, options);
    }
  }, {
    key: 'counter',
    value: async function counter(address) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      options = (0, _assign2.default)({ create: true, type: 'counter' }, options);
      return this.open(address, options);
    }
  }, {
    key: 'docs',
    value: async function docs(address) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      options = (0, _assign2.default)({ create: true, type: 'docstore' }, options);
      return this.open(address, options);
    }
  }, {
    key: 'docstore',
    value: async function docstore(address) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.docs(address, options);
    }
  }, {
    key: 'disconnect',
    value: async function disconnect() {
      // Close all open databases
      var databases = (0, _values2.default)(this.stores);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)(databases), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var db = _step.value;

          await db.close();
          delete this.stores[db.address.toString()];
        }

        // Disconnect from pubsub
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (this._pubsub) this._pubsub.disconnect

      // Remove all databases from the state
      ();this.stores = {};
    }

    // Alias for disconnect()

  }, {
    key: 'stop',
    value: async function stop() {
      await this.disconnect();
    }

    /* Private methods */

  }, {
    key: '_createStore',
    value: async function _createStore(Store, address, options) {
      var addr = address.toString();

      var accessController = void 0;
      if (options.accessControllerAddress) {
        accessController = new AccessController(this._ipfs);
        await accessController.load(options.accessControllerAddress);
      }

      var cache = await this._loadCache(this.directory, address);

      var opts = (0, _assign2.default)({ replicate: true }, options, {
        accessController: accessController,
        keystore: this.keystore,
        cache: cache
      });

      var store = new Store(this._ipfs, this.id, address, opts);
      store.events.on('write', this._onWrite.bind(this));
      store.events.on('closed', this._onClosed.bind(this));

      this.stores[addr] = store;

      if (opts.replicate && this._pubsub) this._pubsub.subscribe(addr, this._onMessage.bind(this), this._onPeerConnected.bind(this));

      return store;
    }

    // Callback for local writes to the database. We the update to pubsub.

  }, {
    key: '_onWrite',
    value: function _onWrite(address, entry, heads) {
      if (!heads) throw new Error("'heads' not defined");
      if (this._pubsub) this._pubsub.publish(address, heads);
    }

    // Callback for receiving a message from the network

  }, {
    key: '_onMessage',
    value: async function _onMessage(address, heads) {
      var store = this.stores[address];
      try {
        logger.debug('Received ' + heads.length + ' heads for \'' + address + '\':\n', (0, _stringify2.default)(heads.map(function (e) {
          return e.hash;
        }), null, 2));
        await store.sync(heads);
      } catch (e) {
        logger.error(e);
      }
    }

    // Callback for when a peer connected to a database

  }, {
    key: '_onPeerConnected',
    value: function _onPeerConnected(address, peer, room) {
      logger.debug('New peer \'' + peer + '\' connected to \'' + address + '\'');
      var store = this.stores[address];
      if (store) {
        // Send the newly connected peer our latest heads
        var heads = store._oplog.heads;
        if (heads.length > 0) {
          logger.debug('Send latest heads of \'' + address + '\':\n', (0, _stringify2.default)(heads.map(function (e) {
            return e.hash;
          }), null, 2));
          room.sendTo(peer, (0, _stringify2.default)(heads));
        }
        store.events.emit('peer', peer);
      }
    }

    // Callback when database was closed

  }, {
    key: '_onClosed',
    value: function _onClosed(address) {
      logger.debug('Database \'' + address + '\' was closed'

      // Remove the callback from the database
      );this.stores[address].events.removeAllListeners('closed'

      // Unsubscribe from pubsub
      );if (this._pubsub) this._pubsub.unsubscribe(address);

      delete this.stores[address];
    }

    /* Create and Open databases */

    /*
      options = {
        admin: [], // array of keys that are the admins of this database (same as write access)
        write: [], // array of keys that can write to this database
        directory: './orbitdb', // directory in which to place the database files
        overwrite: false, // whether we should overwrite the existing database if it exists
      }
    */

  }, {
    key: 'create',
    value: async function create(name, type) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      logger.debug('create()');

      if (!OrbitDB.isValidType(type)) throw new Error('Invalid database type \'' + type + '\'');

      // The directory to look databases from can be passed in as an option
      var directory = options.directory || this.directory;
      logger.debug('Creating database \'' + name + '\' as ' + type + ' in \'' + directory + '\'');

      if (OrbitDBAddress.isValid(name)) throw new Error('Given database name is an address. Please give only the name of the database!');

      // Create an AccessController
      var accessController = new AccessController(this._ipfs);
      /* Disabled temporarily until we do something with the admin keys */
      // Add admins of the database to the access controller
      // if (options && options.admin) {
      //   options.admin.forEach(e => accessController.add('admin', e))
      // } else {
      //   // Default is to add ourselves as the admin of the database
      //   accessController.add('admin', this.key.getPublic('hex'))
      // }
      // Add keys that can write to the database
      if (options && options.write && options.write.length > 0) {
        options.write.forEach(function (e) {
          return accessController.add('write', e);
        });
      } else {
        // Default is to add ourselves as the admin of the database
        accessController.add('write', this.key.getPublic('hex'));
      }
      // Save the Access Controller in IPFS
      var accessControllerAddress = await accessController.save

      // Save the manifest to IPFS
      ();var manifestHash = await createDBManifest(this._ipfs, name, type, accessControllerAddress

      // Create the database address
      );var dbAddress = OrbitDBAddress.parse(path.join('/orbitdb', manifestHash, name)

      // // Load local cache
      );var haveDB = await this._loadCache(directory, dbAddress).then(function (cache) {
        return cache ? cache.get(path.join(dbAddress.toString(), '_manifest')) : null;
      }).then(function (data) {
        return data !== undefined && data !== null;
      });

      if (haveDB && !options.overwrite) throw new Error('Database \'' + dbAddress + '\' already exists!');

      // Save the database locally
      await this._saveDBManifest(directory, dbAddress);

      logger.debug('Created database \'' + dbAddress + '\''

      // Open the database
      );return this.open(dbAddress, options);
    }

    /*
        options = {
          localOnly: false // if set to true, throws an error if database can't be found locally
          create: false // wether to create the database
          type: TODO
          overwrite: TODO
         }
     */

  }, {
    key: 'open',
    value: async function open(address) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      logger.debug('open()');
      options = (0, _assign2.default)({ localOnly: false, create: false }, options);
      logger.debug('Open database \'' + address + '\''

      // The directory to look databases from can be passed in as an option
      );var directory = options.directory || this.directory;
      logger.debug('Look from \'' + directory + '\''

      // If address is just the name of database, check the options to crate the database
      );if (!OrbitDBAddress.isValid(address)) {
        if (!options.create) {
          throw new Error('\'options.create\' set to \'false\'. If you want to create a database, set \'options.create\' to \'true\'.');
        } else if (options.create && !options.type) {
          throw new Error('Database type not provided! Provide a type with \'options.type\' (' + validTypes.join('|') + ')');
        } else {
          logger.warn('Not a valid OrbitDB address \'' + address + '\', creating the database');
          options.overwrite = options.overwrite ? options.overwrite : true;
          return this.create(address, options.type, options);
        }
      }

      // Parse the database address
      var dbAddress = OrbitDBAddress.parse(address

      // Check if we have the database
      );var haveDB = await this._loadCache(directory, dbAddress).then(function (cache) {
        return cache ? cache.get(path.join(dbAddress.toString(), '_manifest')) : null;
      }).then(function (data) {
        return data !== undefined && data !== null;
      });

      logger.debug((haveDB ? 'Found' : 'Didn\'t find') + (' database \'' + dbAddress + '\'')

      // If we want to try and open the database local-only, throw an error
      // if we don't have the database locally
      );if (options.localOnly && !haveDB) {
        logger.error('Database \'' + dbAddress + '\' doesn\'t exist!');
        throw new Error('Database \'' + dbAddress + '\' doesn\'t exist!');
      }

      logger.debug('Loading Manifest for \'' + dbAddress + '\''

      // Get the database manifest from IPFS
      );var dag = await this._ipfs.object.get(dbAddress.root);
      var manifest = JSON.parse(dag.toJSON().data);
      logger.debug('Manifest for \'' + dbAddress + '\':\n' + (0, _stringify2.default)(manifest, null, 2)

      // Make sure the type from the manifest matches the type that was given as an option
      );if (options.type && manifest.type !== options.type) throw new Error('Database \'' + dbAddress + '\' is type \'' + manifest.type + '\' but was opened as \'' + options.type + '\'');

      // Save the database locally
      await this._saveDBManifest(directory, dbAddress

      // Open the the database
      );options = (0, _assign2.default)({}, options, { accessControllerAddress: manifest.accessController });
      return this._openDatabase(dbAddress, manifest.type, options);
    }

    // Save the database locally

  }, {
    key: '_saveDBManifest',
    value: async function _saveDBManifest(directory, dbAddress) {
      var cache = await this._loadCache(directory, dbAddress);
      await cache.set(path.join(dbAddress.toString(), '_manifest'), dbAddress.root);
      logger.debug('Saved manifest to IPFS as \'' + dbAddress.root + '\'');
    }
  }, {
    key: '_loadCache',
    value: async function _loadCache(directory, dbAddress) {
      var cache = void 0;
      try {
        cache = await Cache.load(directory, dbAddress);
      } catch (e) {
        console.log(e);
        logger.error("Couldn't load Cache:", e);
      }

      return cache;
    }
  }, {
    key: '_openDatabase',
    value: async function _openDatabase(address, type, options) {
      if (type === 'counter') return this._createStore(CounterStore, address, options);else if (type === 'eventlog') return this._createStore(EventStore, address, options);else if (type === 'feed') return this._createStore(FeedStore, address, options);else if (type === 'docstore') return this._createStore(DocumentStore, address, options);else if (type === 'keyvalue') return this._createStore(KeyValueStore, address, options);else throw new Error('Invalid database type \'' + type + '\'');
    }
  }], [{
    key: 'isValidType',
    value: function isValidType(type) {
      return validTypes.includes(type);
    }
  }, {
    key: 'create',
    value: function create() {
      return new Error('Not implemented yet!');
    }
  }, {
    key: 'open',
    value: function open() {
      return new Error('Not implemented yet!');
    }
  }]);
  return OrbitDB;
}();

module.exports = OrbitDB;