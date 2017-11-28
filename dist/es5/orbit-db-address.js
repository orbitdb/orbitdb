'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var path = require('path');
var multihash = require('multihashes');

var OrbitDBAddress = function () {
  function OrbitDBAddress(root, path) {
    (0, _classCallCheck3.default)(this, OrbitDBAddress);

    this.root = root;
    this.path = path;
  }

  (0, _createClass3.default)(OrbitDBAddress, [{
    key: 'toString',
    value: function toString() {
      return path.join('/orbitdb', this.root, this.path);
    }
  }], [{
    key: 'isValid',
    value: function isValid(address) {
      var parts = address.toString().split('/').filter(function (e, i) {
        return !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb');
      }).filter(function (e) {
        return e !== '' && e !== ' ';
      });

      var accessControllerHash = parts[0].indexOf('Qm') > -1 ? multihash.fromB58String(parts[0]) : null;
      try {
        multihash.validate(accessControllerHash);
      } catch (e) {
        return false;
      }

      return accessControllerHash !== null;
    }
  }, {
    key: 'parse',
    value: function parse(address) {
      if (!address) throw new Error('Not a valid OrbitDB address: ' + address);

      if (!OrbitDBAddress.isValid(address)) throw new Error('Not a valid OrbitDB address: ' + address);

      var parts = address.toString().split('/').filter(function (e, i) {
        return !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb');
      }).filter(function (e) {
        return e !== '' && e !== ' ';
      });

      return new OrbitDBAddress(parts[0], parts.slice(1, parts.length).join('/'));
    }
  }]);
  return OrbitDBAddress;
}();

module.exports = OrbitDBAddress;