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

  describe('compact', () => {
    it('presents the node as a compacted object', (done) => {
      const node1 = new Node('A', 0, 0, 'hello');
      const node2 = new Node('B', 0, 0, 'hello', [node1]);
      const compacted1 = node1.compact();
      const compacted2 = node2.compact();

      assert.notEqual(compacted1, null);
      assert.equal(compacted1.id, 'A');
      assert.equal(compacted1.seq, 0);
      assert.equal(compacted1.ver, 0);
      assert.equal(compacted1.data, 'hello');
      assert.equal(compacted1.next instanceof Array, true);
      assert.equal(compacted1.next.length, 0);

      assert.equal(compacted2.id, 'B');
      assert.equal(compacted2.next.length, 1);
      assert.equal(compacted2.next[0], 'A.0.0');
      done();
    });
  });
});
