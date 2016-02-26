'use strict';

const assert = require('assert');
const List   = require('../src/list/List');
const Node   = require('../src/list/Node');

describe('Node', () => {
  describe('Constructor', () => {
    it('initializes member variables', (done) => {
      const node = new Node('A', 0, 0, 'hello', []);
      assert.equal(node.id, 'A');
      assert.equal(node.seq, 0);
      assert.equal(node.ver, 0);
      assert.equal(node.data, 'hello');
      assert.equal(node.next instanceof Array, true);
      done();
    });

    it('initializes member variables without specified data and next', (done) => {
      const node = new Node('A', 0, 0);
      assert.equal(node.id, 'A');
      assert.equal(node.seq, 0);
      assert.equal(node.ver, 0);
      assert.equal(node.data, null);
      assert.equal(node.next instanceof Array, true);
      done();
    });
  });

  describe('compactId', () => {
    it('presents the node as a string with id, sequence and version', (done) => {
      const node1 = new Node('A', 0, 0);
      const node2 = new Node('B', 123, 456);
      assert.equal(node1.compactId, 'A.0.0');
      assert.equal(node2.compactId, 'B.123.456');
      done();
    });
  });

});
