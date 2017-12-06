'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var path = require('path'

// Creates a DB manifest file and saves it in IPFS
);var createDBManifest = async function createDBManifest(ipfs, name, type, accessControllerAddress) {
  var manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress)
  };
  var dag = await ipfs.object.put(Buffer.from((0, _stringify2.default)(manifest)));
  return dag.toJSON().multihash.toString();
};

module.exports = createDBManifest;