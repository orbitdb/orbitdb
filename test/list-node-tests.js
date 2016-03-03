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

  describe('equals', () => {
    it('check if nodes are equal', (done) => {
      const node1 = new Node('A', 0, 0);
      const node2 = new Node('A', 0, 0);
      const node3 = new Node('A', 1, 1);
      const node4 = new Node('B', 123, 456);
      assert.equal(Node.equals(node1, node1), true);
      assert.equal(Node.equals(node1, node2), true);
      assert.equal(Node.equals(node1, node3), false);
      assert.equal(Node.equals(node1, node4), false);
      assert.equal(Node.equals(node3, node4), false);
      done();
    });
  });

  describe('hasChild', () => {
    it('finds the child reference', (done) => {
      const a = new Node('A', 0, 0);
      const b = new Node('B', 0, 0, "hello", [a]);
      const c = new Node('C', 0, 0, "hello", [a, b]);
      assert.equal(b.hasChild(a), true)
      assert.equal(c.hasChild(a), true)
      assert.equal(c.hasChild(b), true)
      done();
    });
  });

});
