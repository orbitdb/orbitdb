'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var AccessController = function () {
  function AccessController() {
    (0, _classCallCheck3.default)(this, AccessController);

    this._access = {
      admin: [],
      write: [],
      read: [] // Not used atm
    };
  }

  /* Overridable functions */


  (0, _createClass3.default)(AccessController, [{
    key: 'load',
    value: async function load(address) {}
  }, {
    key: 'save',
    value: async function save() {}

    /* Properties */

  }, {
    key: 'add',


    /* Public Methods */
    value: function add(access, key) {
      // if(!Object.keys(this._access).includes(access))
      //   throw new Error(`unknown access level: ${access}`)
      // if (!this._access[access].includes(key))
      //   this._access[access].push(key)

      // TODO: uniques only
      switch (access) {
        case 'admin':
          this._access.admin.push(key);
          break;
        case 'write':
          this._access.write.push(key);
          break;
        case 'read':
          this._access.read.push(key);
          break;
        default:
          break;
      }
    }
  }, {
    key: 'remove',
    value: function remove(access, key) {
      var without = function without(arr, e) {
        var reducer = function reducer(res, val) {
          if (val !== key) res.push(val);
          return res;
        };
        return arr.reduce(reducer, []);
      };

      // if(!Object.keys(this._access).includes(access))
      //   throw new Error(`unknown access level: ${access}`)
      // if (this._access[access].includes(key))
      //   this._access[access] = without(this._access[access], key)

      switch (access) {
        case 'admin':
          this._access.admin = without(this._access.admin, key);
          break;
        case 'write':
          this._access.write = without(this._access.write, key);
          break;
        case 'read':
          this._access.read = without(this._access.read, key);
          break;
        default:
          break;
      }
    }
  }, {
    key: 'admin',
    get: function get() {
      return this._access.admin;
    }
  }, {
    key: 'write',
    get: function get() {
      // Both admins and write keys can write
      return this._access.write.concat(this._access.admin);
    }

    // Not used atm

  }, {
    key: 'read',
    get: function get() {
      return this._access.read;
    }
  }]);
  return AccessController;
}();

module.exports = AccessController;