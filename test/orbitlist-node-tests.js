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
  this.timeout(5000);

  before(async((done) => {
    ipfs = await(startIpfs());
    done();
  }));

  describe('Constructor', () => {
    it('initializes member variables', async((done) => {
      const node = new Node(ipfs, 'A');
      assert.equal(node.id, 'A');
      assert.equal(node.data, null);
      assert.equal(node.next.length, 0);
      assert.equal(node.hash, 'QmbibmqvDT4LHo6oEFRMgRhKUBw6Fn7SLCp57GKu5eY1uY');
      assert.equal(node._ipfs, ipfs);
      done();
    }));

    it('initializes member variables with data', async((done) => {
      const node = new Node(ipfs, 'A', 'QmbibmqvDT4LHo6oEFRMgRhKUBw6Fn7SLCp57GKu5eY1uY');
      assert.equal(node.id, 'A');
      assert.equal(node.data, 'QmbibmqvDT4LHo6oEFRMgRhKUBw6Fn7SLCp57GKu5eY1uY');
      assert.equal(node.next.length, 0);
      assert.equal(node.hash, 'Qme1c5GGCtkBLZV4dVsZtJj2ZREraupAfyJXrYrzfEVKN5');
      assert.equal(node._ipfs, ipfs);
      done();
    }));
  });

  describe('fetchPayload', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('hasChild', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('fetchPayload', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('heads', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('ipfsHash', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('asJson', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('fromIpfsHash', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

  describe('equals', () => {
    it('TODO', async((done) => {
      done();
    }));
  });

});
