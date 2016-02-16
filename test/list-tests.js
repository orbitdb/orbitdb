'use strict';

var assert = require('assert');
var async  = require('asyncawait/async');
var await  = require('asyncawait/await');
var List   = require('../test1').List;
var Node   = require('../test1').Node;

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

    it('initializes member variables without data and next', (done) => {
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

describe('List', () => {
  describe('Constructor', () => {
    it('initializes member variables', (done) => {
      const list = new List('A');
      assert.equal(list.id, 'A');
      assert.equal(list.seq, 0);
      assert.equal(list.ver, 0);
      assert.equal(list._items instanceof Array, true);
      assert.equal(list._currentBatch instanceof Array, true);
      assert.equal(list._items.length, 0);
      assert.equal(list._currentBatch.length, 0);
      done();
    });
  });

  describe('items', () => {
    it('returns items', (done) => {
      const list = new List('A');
      let items = list.items;
      assert.equal(list.items instanceof Array, true);
      assert.equal(list.items.length, 0);
      list.add("hello1")
      list.add("hello2")
      assert.equal(list.items instanceof Array, true);
      assert.equal(list.items.length, 2);
      assert.equal(list.items[0].data, 'hello1');
      assert.equal(list.items[1].data, 'hello2');
      done();
    });
  });

  describe('toJson', () => {
    it('presents the list in a compacted json form', (done) => {
      const list = new List('A');
      list.add("hello1")
      list.add("hello2")
      list.add("hello3")
      // list.add("hello4")
      // list.add("hello5")
      let compacted = list.toJson();
      // console.log(compacted)
      assert.equal(compacted.id, 'A');
      assert.equal(compacted.seq, 0);
      assert.equal(compacted.ver, 3);
      assert.equal(compacted.items.length, 3);
      assert.equal(compacted.items[0].id, 'A');
      assert.equal(compacted.items[0].seq, 0);
      assert.equal(compacted.items[0].ver, 0);
      assert.equal(compacted.items[0].next.length, 0);
      assert.equal(compacted.items[compacted.items.length - 1].id, 'A');
      assert.equal(compacted.items[compacted.items.length - 1].seq, 0);
      assert.equal(compacted.items[compacted.items.length - 1].ver, 2);
      assert.equal(compacted.items[compacted.items.length - 1].next.length, 1);
      assert.equal(compacted.items[compacted.items.length - 1].next[0], 'A.0.1');
      assert.equal(compacted.items[compacted.items.length - 2].id, 'A');
      assert.equal(compacted.items[compacted.items.length - 2].seq, 0);
      assert.equal(compacted.items[compacted.items.length - 2].ver, 1);
      assert.equal(compacted.items[compacted.items.length - 2].next.length, 1);
      assert.equal(compacted.items[compacted.items.length - 2].next[0], 'A.0.0');
      done();
    });
  });

  describe('add', () => {
    it('adds an item to an empty list', (done) => {
      const list = new List('A');
      list.add("hello1")
      const item = list.items[0];
      assert.equal(list.id, 'A');
      assert.equal(list.seq, 0);
      assert.equal(list.ver, 1);
      assert.equal(list.items.length, 1);
      assert.equal(list._currentBatch.length, 1);
      assert.equal(list._items.length, 0);
      assert.equal(item, list._currentBatch[0]);
      assert.equal(item.id, 'A');
      assert.equal(item.seq, 0);
      assert.equal(item.ver, 0);
      assert.equal(item.data, 'hello1');
      done();
    });

    it('adds 100 items to a list', (done) => {
      const list = new List('A');

      for(let i = 1; i < 101; i ++) {
        list.add("hello" + i);
      }

      assert.equal(list.id, 'A');
      assert.equal(list.seq, 0);
      assert.equal(list.ver, 100);
      assert.equal(list.items.length, 100);
      assert.equal(list._currentBatch.length, 100);
      assert.equal(list._items.length, 0);

      const item = list.items[list.items.length - 1];
      assert.equal(item, list._currentBatch[list._currentBatch.length - 1]);
      assert.equal(item.id, 'A');
      assert.equal(item.seq, 0);
      assert.equal(item.ver, 99);
      assert.equal(item.data, 'hello100');
      assert.equal(item.next, 'A.0.98');

      done();
    });
  });

  describe('join', () => {
    it('increases the sequence and resets the version if other list has the same or higher sequence', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');

      list2.seq = 7;
      list1.add("helloA1")

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 0);
      assert.equal(list1.ver, 1);

      list2.add("helloB1")
      list1.join(list2);

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 8);
      assert.equal(list1.ver, 0);
      done();
    });

    it('increases the sequence by one if other list has lower sequence', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.seq = 4;
      list2.seq = 1;
      list2.add("helloB1")
      list1.join(list2);
      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 5);
      assert.equal(list1.ver, 0);
      done();
    });

    it('finds the next head when adding a new element', (done) => {
      const list1 = new List('A');
      list1.add("helloA1")
      list1.add("helloA2")
      list1.add("helloA3")

      // console.log(list1.toString())
      assert.equal(list1._currentBatch.length, 3);
      assert.equal(list1._currentBatch[2].next.length, 1);
      assert.equal(list1._currentBatch[2].next[0], 'A.0.1');
      done();
    });

    it('finds the next heads after joining a list with another', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);
      list1.add("helloA2")

      assert.equal(list1._currentBatch.length, 1);
      assert.equal(list1._currentBatch[0].next.length, 2);
      assert.equal(list1._currentBatch[0].next[0], 'A.0.0');
      assert.equal(list1._currentBatch[0].next[1], 'B.0.1');
      done();
    });

    it('finds the next head after a two-way join', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      list1.add("helloA2")
      list1.add("helloA3")

      assert.equal(list1._currentBatch.length, 2);
      assert.equal(list1._currentBatch[1].next.length, 1);
      assert.equal(list1._currentBatch[1].next[0], 'A.1.0');
      done();
    });

    it('find sthe next heads after join two-way join', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list1.add("helloA2")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      list1.add("helloA3")

      list1.join(list2);

      list1.add("helloA4")
      list1.add("helloA5")

      const lastItem = list1.items[list1.items.length - 1];
      // console.log(list1.toString())
      assert.equal(list1.items.length, 7);
      assert.equal(lastItem.next.length, 1);
      assert.equal(lastItem.next[0], 'A.2.0');
      done();
    });

    it('joins list of one item with list of two items', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      // console.log(list1)
      // console.log(list2)

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 1);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 3);
      assert.equal(list1._items[list1._items.length - 1].id, 'B');
      assert.equal(list1._items[list1._items.length - 1].seq, 0);
      assert.equal(list1._items[list1._items.length - 1].ver, 1);
      assert.equal(list1._items[list1._items.length - 1].data, 'helloB2');
      done();
    });

    it('joins lists two ways', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list1.add("helloA2")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);
      list2.join(list1);

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 1);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 4);
      assert.equal(list1._items[list1._items.length - 1].id, 'B');
      assert.equal(list1._items[list1._items.length - 1].seq, 0);
      assert.equal(list1._items[list1._items.length - 1].ver, 1);
      assert.equal(list1._items[list1._items.length - 1].data, 'helloB2');

      assert.equal(list2.id, 'B');
      assert.equal(list2.seq, 2);
      assert.equal(list2.ver, 0);
      assert.equal(list2._currentBatch.length, 0);
      assert.equal(list2._items.length, 4);
      assert.equal(list2._items[list2._items.length - 1].id, 'A');
      assert.equal(list2._items[list2._items.length - 1].seq, 0);
      assert.equal(list2._items[list2._items.length - 1].ver, 1);
      assert.equal(list2._items[list2._items.length - 1].data, 'helloA2');
      done();
    });

    it('joins lists twice', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');

      list1.add("helloA1")
      list2.add("helloB1")
      list2.join(list1);

      list1.add("helloA2")
      list2.add("helloB2")
      list2.join(list1);

      assert.equal(list2.id, 'B');
      assert.equal(list2.seq, 2);
      assert.equal(list2.ver, 0);
      assert.equal(list2._currentBatch.length, 0);
      assert.equal(list2._items.length, 4);
      assert.equal(list2._items[1].id, 'A');
      assert.equal(list2._items[1].seq, 0);
      assert.equal(list2._items[1].ver, 0);
      assert.equal(list2._items[1].data, 'helloA1');
      assert.equal(list2._items[list2._items.length - 1].id, 'A');
      assert.equal(list2._items[list2._items.length - 1].seq, 0);
      assert.equal(list2._items[list2._items.length - 1].ver, 1);
      assert.equal(list2._items[list2._items.length - 1].data, 'helloA2');
      done();
    });

    it('joins 4 lists', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      const list3 = new List('C');
      const list4 = new List('D');

      list1.add("helloA1")
      list2.add("helloB1")
      // list2.join(list1);

      list1.add("helloA2")
      list2.add("helloB2")
      // list2.join(list1);

      list3.add("helloC1")
      list4.add("helloD1")
      // list2.join(list1);

      list3.add("helloC2")
      list4.add("helloD2")
      list1.join(list2);
      list1.join(list3);
      list1.join(list4);

      assert.equal(list1.id, 'A');
      // assert.equal(list1.seq, 1);
      // assert.equal(list1.ver, 1);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 8);
      assert.equal(list1._items[1].id, 'A');
      assert.equal(list1._items[1].seq, 0);
      assert.equal(list1._items[1].ver, 1);
      assert.equal(list1._items[1].data, 'helloA2');
      assert.equal(list1._items[list1._items.length - 1].id, 'D');
      assert.equal(list1._items[list1._items.length - 1].seq, 0);
      assert.equal(list1._items[list1._items.length - 1].ver, 1);
      assert.equal(list1._items[list1._items.length - 1].data, 'helloD2');
      done();
    });

    it('joins 4 lists sequentally', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      const list3 = new List('C');
      const list4 = new List('D');

      list1.add("helloA1")
      list1.join(list2);
      list2.add("helloB1")
      list2.join(list1);

      list1.add("helloA2")
      list2.add("helloB2")
      list1.join(list3);
      list3.join(list1);

      list3.add("helloC1")
      list4.add("helloD1")

      list3.add("helloC2")
      list4.add("helloD2")

      list1.join(list3);
      list1.join(list2);
      list4.join(list2);
      list4.join(list1);
      list4.join(list3);

      list4.add("helloD3")
      list4.add("helloD4")

      // console.log(list4.toString());
      assert.equal(list4.id, 'D');
      assert.equal(list4.seq, 7);
      assert.equal(list4.ver, 2);
      assert.equal(list4._currentBatch.length, 2);
      assert.equal(list4._items.length, 8);
      assert.equal(list4._items[1].id, 'D');
      assert.equal(list4._items[1].seq, 0);
      assert.equal(list4._items[1].ver, 1);
      assert.equal(list4._items[1].data, 'helloD2');
      assert.equal(list4._items[list1._items.length - 1].id, 'A');
      assert.equal(list4._items[list1._items.length - 1].seq, 1);
      assert.equal(list4._items[list1._items.length - 1].ver, 0);
      assert.equal(list4._items[list1._items.length - 1].data, 'helloA2');
      assert.equal(list4.items[list4.items.length - 1].id, 'D');
      assert.equal(list4.items[list4.items.length - 1].seq, 7);
      assert.equal(list4.items[list4.items.length - 1].ver, 1);
      assert.equal(list4.items[list4.items.length - 1].data, 'helloD4');
      done();
    });

  });

  it('solves a graph', (done) => {
    done();
  });

});
