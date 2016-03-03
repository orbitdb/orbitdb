'use strict';

const _          = require('lodash');
const async      = require('asyncawait/async');
const await      = require('asyncawait/await');
const assert     = require('assert');
const ipfsDaemon = require('orbit-common/lib/ipfs-daemon');
const ipfsAPI    = require('orbit-common/lib/ipfs-api-promised');
const Node       = require('../src/list/OrbitNode');

const startIpfs = async (() => {
  return new Promise(async((resolve, reject) => {
    const ipfsd  = await(ipfsDaemon());
    resolve(ipfsd.ipfs);
  }));
});

let ipfs;

describe('OrbitNode', function() {
  this.timeout(10000);

  before(async((done) => {
    ipfs = await(startIpfs());
    done();
  }));

  describe('Constructor', () => {
    it('initializes member variables', async((done) => {
      const node = new Node(ipfs, 'A', 0, 0);
      assert.equal(node.id, 'A');
      assert.equal(node.seq, 0);
      assert.equal(node.ver, 0);
      assert.equal(node.data, null);
      assert.equal(node.next.length, 0);
      assert.equal(node.hash, 'QmNcbwc5V42kkQbnBvtWsmREbUy8PB5cG3J5DTyPWqYkho');
      assert.equal(node._ipfs, ipfs);
      done();
    }));

    it('initializes member variables with data', async((done) => {
      const node = new Node(ipfs, 'A', 0, 0, 'QmTnaGEpw4totXN7rhv2jPMXKfL8s65PhhCKL5pwtJfRxn');
      assert.equal(node.id, 'A');
      assert.equal(node.seq, 0);
      assert.equal(node.ver, 0);
      assert.equal(node.data, 'QmTnaGEpw4totXN7rhv2jPMXKfL8s65PhhCKL5pwtJfRxn');
      assert.equal(node.next.length, 0);
      assert.equal(node.hash, 'QmULakc8SCkz5wz3s1TDkQgZWP1yBrhdXMpHJGJY3sV33r');
      assert.equal(node._ipfs, ipfs);
      done();
    }));
  });

  describe('compactId', () => {
    it('presents the node as a string with id, sequence, version and hash', async((done) => {
      const node1 = new Node(ipfs, 'A', 0, 0, "QmTnaGEpw4totXN7rhv2jPMXKfL8s65PhhCKL5pwtJfRxn");
      const node2 = new Node(ipfs, 'B', 123, 456, "QmdcCucbM2rnHHaVhAmjMxWDY5cCDwtTtjhYuS5nBHThQq");
      assert.equal(node1.compactId, 'A.0.0');
      assert.equal(node2.compactId, 'B.123.456');
      done();
    }));
  });
});
