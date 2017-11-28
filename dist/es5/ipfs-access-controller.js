'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var AccessController = require('./access-controller');

var IPFSAccessController = function (_AccessController) {
  (0, _inherits3.default)(IPFSAccessController, _AccessController);

  function IPFSAccessController(ipfs) {
    (0, _classCallCheck3.default)(this, IPFSAccessController);

    var _this = (0, _possibleConstructorReturn3.default)(this, (IPFSAccessController.__proto__ || (0, _getPrototypeOf2.default)(IPFSAccessController)).call(this));

    _this._ipfs = ipfs;
    return _this;
  }

  (0, _createClass3.default)(IPFSAccessController, [{
    key: 'load',
    value: async function load(address) {
      // Transform '/ipfs/QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
      // to 'QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
      if (address.indexOf('/ipfs') === 0) address = address.split('/')[2];

      try {
        var dag = await this._ipfs.object.get(address);
        var obj = JSON.parse(dag.toJSON().data);
        this._access = obj;
      } catch (e) {
        console.log("ACCESS ERROR:", e);
      }
    }
  }, {
    key: 'save',
    value: async function save() {
      var hash = void 0;
      try {
        var access = (0, _stringify2.default)(this._access, null, 2);
        var dag = await this._ipfs.object.put(new Buffer(access));
        hash = dag.toJSON().multihash.toString();
      } catch (e) {
        console.log("ACCESS ERROR:", e);
      }
      return hash;
    }
  }]);
  return IPFSAccessController;
}(AccessController);

module.exports = IPFSAccessController;