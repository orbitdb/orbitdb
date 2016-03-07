'use strict';

const _          = require('lodash');
const async      = require('asyncawait/async');
const await      = require('asyncawait/await');
const assert     = require('assert');
const ipfsDaemon = require('orbit-common/lib/ipfs-daemon');
const ipfsAPI    = require('orbit-common/lib/ipfs-api-promised');
const List       = require('../src/list/OrbitList');
const Node       = require('../src/list/OrbitNode');

const startIpfs = async (() => {
  return new Promise(async((resolve, reject) => {
    const ipfsd  = await(ipfsDaemon());
    resolve(ipfsd.ipfs);
  }));
});

let ipfs;

describe('OrbitList', async(function() {
  this.timeout(5000);

  before(async((done) => {
    ipfs = await(startIpfs());
    done();
  }));

  describe('Constructor', async(() => {
    it('initializes member variables', async((done) => {
      const list = new List(ipfs, 'A');
      assert.equal(list.id, 'A');
      assert.equal(list.seq, 0);
      assert.equal(list.ver, 0);
      assert.equal(list._items instanceof Array, true);
      assert.equal(list._currentBatch instanceof Array, true);
      assert.equal(list._items.length, 0);
      assert.equal(list._currentBatch.length, 0);
      assert.equal(list._ipfs, ipfs);
      assert.equal(list.hash, null);
      done();
    }));
  }));

  describe('add', async(() => {
    it('saves the data to ipfs', async((done) => {
      const list = new List(ipfs, 'A');
      const text = 'testing 1 2 3 4';
      list.add(text)
      const hash = list.ipfsHash;

      const l = await(ipfsAPI.getObject(ipfs, hash));
      const list2 = List.fromJson(ipfs, JSON.parse(l.Data));
      assert.equal(list2.items[0].data, text);
      assert.equal(list2.items[0].id, 'A');
      assert.equal(list2.items[0].seq, 0);
      assert.equal(list2.items[0].ver, 0);
      assert.equal(list2.items[0].hash, 'QmWqjmn62GQjR7RTsUKXMtxDYVoY7GQVCfUECGmLET3BQ2');
      assert.equal(Object.keys(list2.items[0].next).length, 0);

      done();
    }));

    it('updates the data to ipfs', async((done) => {
      const list = new List(ipfs, 'A');
      const text1 = 'testing 1 2 3';
      const text2 = 'testing 456';
      let hash;

      list.add(text1)

      hash = list.ipfsHash;
      assert.equal(hash, 'Qmf1Fjq7y2s7LbH3ktZfd99knCzYwP8cAE9zFQWj7LSv9x');

      list.add(text2)
      hash = list.ipfsHash;
      assert.equal(hash, 'Qmecju6aNyQF8LHUNbUrujMmXPfUit7tDkqnmLKLF22aRk');

      const list2 = List.fromIpfsHash(ipfs, hash);
      assert.equal(list2.items[0].data, text1);
      assert.equal(list2.items[1].data, text2);

      done();
    }));
  }));

  describe('ipfsHash', async(() => {
    it('returns the list as ipfs hash', async((done) => {
      const list = new List(ipfs, 'A');
      const hash = list.ipfsHash;
      assert.equal(hash.startsWith('Qm'), true);
      done();
    }));

    it('saves the list to ipfs', async((done) => {
      const list = new List(ipfs, 'A');
      const hash = list.ipfsHash;
      const l = await(ipfsAPI.getObject(ipfs, hash));
      assert.equal(l.toString(), ({ Links: [], Data: '{"id":"A","seq":0,"ver":0,"items":[]}' }).toString());
      done();
    }));
  }));

  describe('fromIpfsHash', () => {
    it('creates a list from ipfs hash', async((done) => {
      const list = new List(ipfs, 'A');
      list.add("hello1")
      list.add("hello2")
      list.add("hello3")
      const hash = list.ipfsHash;
      const res = List.fromIpfsHash(ipfs, hash);

      assert.equal(res.id, 'A');
      assert.equal(res.seq, 0);
      assert.equal(res.ver, 3);
      assert.equal(res.items.length, 3);
      assert.equal(res.items[0].compactId, 'A.0.0');
      assert.equal(res.items[0].hash, 'QmQQyTLqcB7ySH5zVCbks1UWQEgrv3m5ygSRL88BHghg95');
      assert.equal(res.items[1].compactId, 'A.0.1');
      assert.equal(res.items[1].hash, 'Qmbwx1b2CYxMmpQmJFKRsqDdGjD5CwfB2QRGP63jypyYFC');
      assert.equal(res.items[2].compactId, 'A.0.2');
      assert.equal(res.items[2].hash, 'QmfLnHHPbMwwAzUNs8inVGzM8tXxb2eLeeQb8Zgc7p3nfY');

      done();
    }));
  });


  describe('serialize', async(() => {

    let list;
    const expected = {
      id: "A",
      seq: 0,
      ver: 3,
      items: {
        "A.0.0": "QmQQyTLqcB7ySH5zVCbks1UWQEgrv3m5ygSRL88BHghg95",
        "A.0.1": "Qmbwx1b2CYxMmpQmJFKRsqDdGjD5CwfB2QRGP63jypyYFC",
        "A.0.2": "QmfLnHHPbMwwAzUNs8inVGzM8tXxb2eLeeQb8Zgc7p3nfY"
      }
    };

    before(async((done) => {
      list = new List(ipfs, 'A');
      list.add("hello1")
      list.add("hello2")
      list.add("hello3")
      done();
    }));

    describe('asJson', async(() => {
      it('presents the list as json', async((done) => {
        assert.equal(JSON.stringify(list.asJson), JSON.stringify(expected));
        done();
      }));
    }));

    describe('fromJson', () => {
      it('creates a list from parsed json', async((done) => {
        const str = JSON.stringify(list.asJson, null, 2)
        const res = List.fromJson(ipfs, JSON.parse(str));

        assert.equal(res.id, 'A');
        assert.equal(res.seq, 0);
        assert.equal(res.ver, 3);
        assert.equal(res.items.length, 3);
        assert.equal(res.items[0].hash, 'QmQQyTLqcB7ySH5zVCbks1UWQEgrv3m5ygSRL88BHghg95');
        assert.equal(res.items[1].hash, 'Qmbwx1b2CYxMmpQmJFKRsqDdGjD5CwfB2QRGP63jypyYFC');
        assert.equal(res.items[2].hash, 'QmfLnHHPbMwwAzUNs8inVGzM8tXxb2eLeeQb8Zgc7p3nfY');
        done();
      }));
    });
  }));


  describe('items', () => {
    it('returns items', async((done) => {
      const list = new List(ipfs, 'A');
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
    }));
  });

  describe('add', () => {
    it('adds an item to an empty list', async((done) => {
      const list = new List(ipfs, 'A');
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
    }));

    it('adds 100 items to a list', async((done) => {
      const list = new List(ipfs, 'A');
      const amount = 100;

      for(let i = 1; i <= amount; i ++) {
        list.add("hello" + i);
      }

      assert.equal(list.id, 'A');
      assert.equal(list.items.length, amount);

      const item = list.items[list.items.length - 1];
      assert.equal(item.id, 'A');
      assert.equal(item.data, 'hello' + amount);
      assert.notEqual(item.next.length, 0);

      done();
    }));

    it('commits a list after batch size was reached', async((done) => {
      const list = new List(ipfs, 'A');

      for(let i = 1; i <= List.batchSize; i ++) {
        list.add("hello" + i);
      }

      assert.equal(list.id, 'A');
      assert.equal(list.seq, 0);
      assert.equal(list.ver, List.batchSize);
      assert.equal(list.items.length, List.batchSize);
      assert.equal(list._currentBatch.length, List.batchSize);
      assert.equal(list._items.length, 0);

      const item = list.items[list.items.length - 1];
      assert.equal(item.id, 'A');
      assert.equal(item.seq, 0);
      assert.equal(item.ver, List.batchSize - 1);
      assert.equal(item.data, 'hello' + List.batchSize);
      assert.notEqual(item.next.length, 0);

      done();
    }));
  });

  describe('join', () => {
    it('increases the sequence and resets the version if other list has the same or higher sequence', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');

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
    }));

    it('increases the sequence by one if other list has lower sequence', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      list1.seq = 4;
      list2.seq = 1;
      list2.add("helloB1")
      list1.join(list2);
      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 5);
      assert.equal(list1.ver, 0);
      done();
    }));

    it('finds the next head when adding a new element', async((done) => {
      const list1 = new List(ipfs, 'A');
      list1.add("helloA1")
      list1.add("helloA2")
      list1.add("helloA3")

      assert.equal(list1._currentBatch.length, 3);
      assert.equal(list1._currentBatch[0].next.length, 0);
      assert.equal(list1._currentBatch[1].next.length, 1);
      assert.equal(list1._currentBatch[1].next[0].compactId, 'A.0.0');
      assert.equal(list1._currentBatch[1].next[0].hash, 'QmYTUeiK82guFDyB9tJgHZuBpNkUqNyFBuajYrCsaxPXvW');
      assert.equal(list1._currentBatch[2].next.length, 1);
      assert.equal(list1._currentBatch[2].next[0].compactId, 'A.0.1');
      assert.equal(list1._currentBatch[2].next[0].hash, 'QmUycQmNU8apkbPqsWPK3VxMHJeHt86UQrzfSFDNRGbvsd');
      done();
    }));

    it('finds the next heads (two) after a join', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);
      list1.add("helloA2")

      assert.equal(list1._currentBatch.length, 1);
      assert.equal(list1._currentBatch[0].next.length, 2);
      assert.equal(list1._currentBatch[0].next[1].compactId, 'A.0.0');
      assert.equal(list1._currentBatch[0].next[1].hash, 'QmYTUeiK82guFDyB9tJgHZuBpNkUqNyFBuajYrCsaxPXvW');
      assert.equal(list1._currentBatch[0].next[0].compactId, 'B.0.1');
      assert.equal(list1._currentBatch[0].next[0].hash, 'QmVmkwMoz4vnvHQwvFwqaoWCrjonsPpyJ6i436Zajht5ao');
      done();
    }));

    it('finds the next head (one) after a join', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      list1.add("helloA2")
      list1.add("helloA3")

      assert.equal(list1._currentBatch.length, 2);
      assert.equal(list1._currentBatch[1].next.length, 2);
      assert.equal(list1._currentBatch[1].next[0].compactId, 'A.1.0');
      assert.equal(list1._currentBatch[1].next[0].hash, 'QmcMUW2F6wqoNtsiV2gXXTvEzXGM9xexN1mgyCLH4LXJ51');
      assert.equal(list1._currentBatch[1].next[1].compactId, 'B.0.1');
      assert.equal(list1._currentBatch[1].next[1].hash, 'QmVmkwMoz4vnvHQwvFwqaoWCrjonsPpyJ6i436Zajht5ao');
      done();
    }));

    it('finds the next heads after two joins', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
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

      assert.equal(list1.items.length, 7);
      assert.equal(lastItem.next.length, 2);
      assert.equal(lastItem.next[0].compactId, 'A.2.0');
      assert.equal(lastItem.next[0].hash, 'QmTS2p5VTk5WkbtjAVC5ALk6NiYinyAWAmet2EhCBCLKmf');
      assert.equal(lastItem.next[1].compactId, 'B.0.1');
      assert.equal(lastItem.next[1].hash, 'QmVmkwMoz4vnvHQwvFwqaoWCrjonsPpyJ6i436Zajht5ao');
      done();
    }));

    it('finds the next heads after multiple joins', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      const list3 = new List(ipfs, 'C');
      const list4 = new List(ipfs, 'D');
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

      assert.equal(list1.items.length, 11);
      assert.equal(lastItem.next.length, 4);
      assert.equal(lastItem.next[1].compactId, 'A.4.0');
      assert.equal(lastItem.next[1].hash, 'QmXXKZDrWAFPUiCdBLJ378xJDBkjdwbVhAqovo6dwChoqx');
      assert.equal(lastItem.next[3].compactId, 'B.0.1');
      assert.equal(lastItem.next[3].hash, 'QmVmkwMoz4vnvHQwvFwqaoWCrjonsPpyJ6i436Zajht5ao');
      assert.equal(lastItem.next[2].compactId, 'C.0.0');
      assert.equal(lastItem.next[2].hash, 'QmTPfJRsLKPmxYrd82p16mry6vYTMoMFTH2jSbYVR8KvgD');
      assert.equal(lastItem.next[0].compactId, 'D.0.2');
      assert.equal(lastItem.next[0].hash, 'QmVT3DvmggXq3AdVK7JBfF4Jit3xpbgqP8dFK7TePtit4B');
      done();
    }));

    it('joins list of one item with list of two items', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      list1.add("helloA1")
      list2.add("helloB1")
      list2.add("helloB2")
      list1.join(list2);

      const lastItem = list1.items[list1.items.length - 1];

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 1);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 3);
      assert.equal(lastItem.id, 'B');
      assert.equal(lastItem.seq, 0);
      assert.equal(lastItem.ver, 1);
      assert.equal(lastItem.data, 'helloB2');
      done();
    }));

    it('joins lists two ways', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
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
    }));

    it('joins lists twice', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');

      list1.add("helloA1")
      list2.add("helloB1")
      list2.join(list1);

      list1.add("helloA2")
      list2.add("helloB2")
      list2.join(list1);

      const secondItem = list2.items[1];
      const lastItem = list2.items[list2.items.length - 1];

      assert.equal(list2.id, 'B');
      assert.equal(list2.seq, 2);
      assert.equal(list2.ver, 0);
      assert.equal(list2._currentBatch.length, 0);
      assert.equal(list2._items.length, 4);
      assert.equal(secondItem.id, 'A');
      assert.equal(secondItem.seq, 0);
      assert.equal(secondItem.ver, 0);
      assert.equal(secondItem.data, 'helloA1');
      assert.equal(lastItem.id, 'A');
      assert.equal(lastItem.seq, 0);
      assert.equal(lastItem.ver, 1);
      assert.equal(lastItem.data, 'helloA2');
      done();
    }));

    it('joins 4 lists to one', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      const list3 = new List(ipfs, 'C');
      const list4 = new List(ipfs, 'D');

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

      const secondItem = list1.items[1];
      const lastItem = list1.items[list1.items.length - 1];

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 3);
      assert.equal(list1.ver, 0);
      assert.equal(list1._currentBatch.length, 0);
      assert.equal(list1._items.length, 8);
      assert.equal(secondItem.id, 'A');
      assert.equal(secondItem.seq, 0);
      assert.equal(secondItem.ver, 1);
      assert.equal(secondItem.data, 'helloA2');
      assert.equal(lastItem.id, 'D');
      assert.equal(lastItem.seq, 0);
      assert.equal(lastItem.ver, 1);
      assert.equal(lastItem.data, 'helloD2');
      done();
    }));

    it('joins lists from 4 lists', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'B');
      const list3 = new List(ipfs, 'C');
      const list4 = new List(ipfs, 'D');

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
    }));

    it('joins itself', async((done) => {
      const list1 = new List(ipfs, 'A');
      list1.add("helloA1")
      list1.add("helloA2")
      list1.add("helloA3")
      list1.join(list1);

      assert.equal(list1.id, 'A');
      assert.equal(list1.seq, 1);
      assert.equal(list1.ver, 0);
      assert.equal(list1.items.length, 3);
      assert.equal(list1.items[0].ver, 0);
      assert.equal(list1.items[1].ver, 1);
      assert.equal(list1.items[2].ver, 2);
      done();
    }));

    it('fetches items from history', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'AAA');

      const count = 32;
      for(let i = 1; i < count + 1; i ++) {
        list1.add("first " + i);
        list2.add("second " + i);
      }

      const hash1 = list1.ipfsHash;
      const hash2 = list2.ipfsHash;
      assert.equal(hash1, 'QmWTHVjf95GSFMErzGwNRzjnEwb7Z5SUo1Qb283oRzLvAT');
      assert.equal(hash2, 'QmVME1BiyuNZZRXZu1npPypav1jMy3XbqHjFt4xdTzUzCd');

      const final = new List(ipfs, 'B');
      const other1 = List.fromIpfsHash(ipfs, hash1);
      const other2 = List.fromIpfsHash(ipfs, hash2);
      final.join(other1);

      assert.equal(final.items.length, count);
      assert.equal(final.items[0].data, "first 1");
      assert.equal(final.items[final.items.length - 1].data, "first " + count);

      final.join(other2);
      assert.equal(final.items.length, count * 2);
      assert.equal(final.items[0].data, "second 1");
      assert.equal(final.items[final.items.length - 1].data, "second " + count);
      done();
    }));

    it('orders fetched items correctly', async((done) => {
      const list1 = new List(ipfs, 'A');
      const list2 = new List(ipfs, 'AAA');

      const count = List.batchSize * 3;
      for(let i = 1; i < (count * 2) + 1; i ++)
        list1.add("first " + i);

      const hash1 = list1.ipfsHash;
      assert.equal(hash1, 'QmaJ2a1AxPBhKcis1HLRnc1UNixSmwd9XBNJzxdnqQSyYa');

      const final = new List(ipfs, 'B');
      const other1 = List.fromIpfsHash(ipfs, hash1);
      final.join(other1);

      assert.equal(final.items[0].data, "first 1");
      assert.equal(final.items[final.items.length - 1].data, "first " + count * 2);
      assert.equal(final.items.length, count * 2);

      // Second batch
      for(let i = 1; i < count + 1; i ++)
        list2.add("second " + i);

      const hash2 = list2.ipfsHash;
      assert.equal(hash2, 'QmVQ55crzwWY21D7LwMLrxT7aKvCoSVtpo23WRdajSHtBN');

      const other2 = List.fromIpfsHash(ipfs, hash2);
      final.join(other2);

      // console.log(final.items.map((e) => e.comptactId))
      assert.equal(final.items.length, count + count * 2);
      assert.equal(final.items[0].data, "second 1");
      assert.equal(final.items[1].data, "second 2");
      assert.equal(final.items[final.items.length - 1].data, "second " + count);
      done();
    }));

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

}));
