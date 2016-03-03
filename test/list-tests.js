'use strict';

const _    = require('lodash');
var assert = require('assert');
var List   = require('../src/list/List');
var Node   = require('../src/list/Node');

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

  describe('fromJson', () => {
    it('creates a list from parsed json', (done) => {
      const list = new List('A');
      list.add("hello1")
      list.add("hello2")
      list.add("hello3")
      const str = JSON.stringify(list.asJson, null, 2)
      const res = List.fromJson(JSON.parse(str));
      assert.equal(res.id, 'A');
      assert.equal(res.seq, 0);
      assert.equal(res.ver, 3);
      assert.equal(res.items.length, 3);
      assert.equal(res.items[0].compactId, 'A.0.0');
      assert.equal(res.items[1].compactId, 'A.0.1');
      assert.equal(res.items[2].compactId, 'A.0.2');
      done();
    });
  });

  describe('asJson', () => {
    it('presents the list as json', (done) => {
      const list = new List('A');
      list.add("hello1")
      list.add("hello2")
      list.add("hello3")
      const expected = {
        id: 'A',
        seq: 0,
        ver: 3,
        items: [
          { id: 'A', seq: 0, ver: 0, data: 'hello1', next: [] },
          { id: 'A', seq: 0, ver: 1, data: 'hello2', next: ['A.0.0'] },
          { id: 'A', seq: 0, ver: 2, data: 'hello3', next: ['A.0.1'] }
        ]
      };
      assert.equal(_.isEqual(list.asJson, expected), true);
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

      assert.equal(list1._currentBatch.length, 3);
      assert.equal(list1._currentBatch[2].next.length, 1);
      assert.equal(list1._currentBatch[2].next[0], 'A.0.1');
      done();
    });

    it('finds the next heads (two) after a join', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);
      list1.add("helloA2")

      assert.equal(list1._currentBatch.length, 1);
      assert.equal(list1._currentBatch[0].next.length, 2);
      assert.equal(list1._currentBatch[0].next[1], 'A.0.0');
      assert.equal(list1._currentBatch[0].next[0], 'B.0.1');
      done();
    });

    it('finds the next head (one) after a join', (done) => {
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

    it('finds the next heads after two joins', (done) => {
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

      const lastItem = list1.items[list1.items.length - 1];

      assert.equal(list1.items.length, 6);
      assert.equal(lastItem.next.length, 1);
      assert.equal(lastItem.next[0], 'A.1.0');
      done();
    });

    it('finds the next heads after multiple joins', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      const list3 = new List('C');
      const list4 = new List('D');
      list1.add("helloA1")
      list1.add("helloA2")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      list3.add("helloC1")
      list4.add("helloD1")
      list1.join(list3);

      list1.add("helloA3")
      list2.join(list1);
      list1.join(list2);
      list2.join(list4);

      list4.add("helloD2")
      list4.add("helloD3")
      list1.add("helloA4")
      list1.join(list4);

      list1.add("helloA5")

      const lastItem = list1.items[list1.items.length - 1];

      assert.equal(lastItem.next[1], 'A.4.0');
      assert.equal(lastItem.next[0], 'D.0.2');
      assert.equal(list1.items.length, 11);
      assert.equal(lastItem.next.length, 2);
      done();
    });

    it('joins list of one item with list of two items', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      const firstItem = list1.items[0];

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 1);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 3);
      assert.equal(firstItem.id, 'A');
      assert.equal(firstItem.seq, 0);
      assert.equal(firstItem.ver, 0);
      assert.equal(firstItem.data, 'helloA1');
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

      const lastItem1 = list1.items[list1.items.length - 1];

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 1);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 4);
      assert.equal(lastItem1.id, 'B');
      assert.equal(lastItem1.seq, 0);
      assert.equal(lastItem1.ver, 1);
      assert.equal(lastItem1.data, 'helloB2');

      const lastItem2 = list2.items[list2.items.length - 1];

      assert.equal(list2.id, 'B');
      assert.equal(list2.seq, 2);
      assert.equal(list2.ver, 0);
      assert.equal(list2._currentBatch.length, 0);
      assert.equal(list2._items.length, 4);
      assert.equal(lastItem2.id, 'A');
      assert.equal(lastItem2.seq, 0);
      assert.equal(lastItem2.ver, 1);
      assert.equal(lastItem2.data, 'helloA2');
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

      const secondItem = list2.items[list2.items.length - 2];
      const lastItem = list2.items[list2.items.length - 1];

      assert.equal(list2.id, 'B');
      assert.equal(list2.seq, 2);
      assert.equal(list2.ver, 0);
      assert.equal(list2._currentBatch.length, 0);
      assert.equal(list2._items.length, 4);
      assert.equal(secondItem.id, 'B');
      assert.equal(secondItem.seq, 1);
      assert.equal(secondItem.ver, 0);
      assert.equal(secondItem.data, 'helloB2');
      assert.equal(lastItem.id, 'A');
      assert.equal(lastItem.seq, 0);
      assert.equal(lastItem.ver, 1);
      assert.equal(lastItem.data, 'helloA2');
      done();
    });

    it('joins 4 lists to one', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      const list3 = new List('C');
      const list4 = new List('D');

      list1.add("helloA1")
      list2.add("helloB1")
      list1.add("helloA2")
      list2.add("helloB2")
      list3.add("helloC1")
      list4.add("helloD1")
      list3.add("helloC2")
      list4.add("helloD2")
      list1.join(list2);
      list1.join(list3);
      list1.join(list4);

      const secondItem = list1.items[list1.items.length - 2];
      const lastItem = list1.items[list1.items.length - 1];

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 3);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 8);
      assert.equal(secondItem.id, 'D');
      assert.equal(secondItem.seq, 0);
      assert.equal(secondItem.ver, 0);
      assert.equal(secondItem.data, 'helloD1');
      assert.equal(lastItem.id, 'D');
      assert.equal(lastItem.seq, 0);
      assert.equal(lastItem.ver, 1);
      assert.equal(lastItem.data, 'helloD2');
      done();
    });

    it('joins lists from 4 lists', (done) => {
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

      const secondItem = list4.items[1];
      const lastItem1 = list4._items[list4._items.length - 1];
      const lastItem2 = list4.items[list4.items.length - 1];

      assert.equal(list4.id, 'D');
      assert.equal(list4.seq, 7);
      assert.equal(list4.ver, 2);
      assert.equal(list4._currentBatch.length, 2);
      assert.equal(list4._items.length, 8);
      assert.equal(secondItem.id, 'D');
      assert.equal(secondItem.seq, 0);
      assert.equal(secondItem.ver, 1);
      assert.equal(secondItem.data, 'helloD2');
      assert.equal(lastItem1.id, 'C');
      assert.equal(lastItem1.seq, 3);
      assert.equal(lastItem1.ver, 1);
      assert.equal(lastItem1.data, 'helloC2');
      assert.equal(lastItem2.id, 'D');
      assert.equal(lastItem2.seq, 7);
      assert.equal(lastItem2.ver, 1);
      assert.equal(lastItem2.data, 'helloD4');
      done();
    });

    it('data is consistent after joining lists', (done) => {
      const list1 = new List('A');
      const list2 = new List('B');
      const list3 = new List('C');

      list1.add("helloA1")
      list2.add("helloB1")
      list3.add("helloC1")

      list1.join(list2);
      list2.join(list1);

      list1.add("helloA2")
      list1.add("helloA3")
      list2.add("helloB2")
      list2.add("helloB3")

      list1.join(list2);
      list2.join(list1);

      list1.add("helloA4")
      list1.add("helloA5")

      list2.add("helloB4")
      list2.add("helloB5")
      list3.add("helloC2")
      list3.add("helloC3")

      list1.add("helloA6")
      list2.join(list1);
      list1.join(list2);

      list1.add("helloA7")
      list1.add("helloA8")

      list2.join(list1);
      list1.join(list2);

      list2.add("helloB6")
      list2.add("helloB7")
      list2.add("helloB8")

      list1.join(list2);
      list2.join(list1);
      list1.join(list3);
      list2.join(list3);
      list3.join(list2);
      list3.join(list1);

      assert.equal(list1._items.length, 19);
      assert.equal(list1.items.map((e) => e.compactId).join(", "), "A.0.0, B.0.0, A.1.0, A.1.1, B.2.0, B.2.1, A.3.0, A.3.1, A.3.2, B.4.0, B.4.1, A.6.0, A.6.1, B.7.0, B.7.1, B.7.2, C.0.0, C.0.1, C.0.2")
      assert.equal(list2.items.map((e) => e.compactId).join(", "), "B.0.0, A.0.0, B.2.0, B.2.1, A.1.0, A.1.1, B.4.0, B.4.1, A.3.0, A.3.1, A.3.2, A.6.0, A.6.1, B.7.0, B.7.1, B.7.2, C.0.0, C.0.1, C.0.2")
      assert.equal(list3.items.map((e) => e.compactId).join(", "), "C.0.0, C.0.1, C.0.2, B.0.0, A.0.0, B.2.0, B.2.1, A.1.0, A.1.1, B.4.0, B.4.1, A.3.0, A.3.1, A.3.2, A.6.0, A.6.1, B.7.0, B.7.1, B.7.2")
      done();
    });

  });

  describe('_findHeads', () => {
    it('TODO', (done) => {
      done();
    });
  });

  describe('_isReferencedInChain', () => {
    it('TODO', (done) => {
      done();
    });
  });

});
