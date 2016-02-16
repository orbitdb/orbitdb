'use strict';

const _ = require('lodash');
const Timer = require('./examples/Timer');

Array.prototype.allEqual = function(val) {
  for(var i = 1; i < this.length; i++) {
    if(this[i] !== val || this[i] !== this[0])
      return false;
  }
  return true;
}

if (!Array.prototype.last){
  Array.prototype.last = function(){
    return this[this.length - 1];
  };
}

class Node {
  constructor(id, seq, ver, data, next) {
    this.id = id;
    this.seq = seq;
    this.ver = ver;
    this.data = data || null;
    this.next = next ? next.map((f) => f.compactId ? f.compactId : f) : [];
  }

  get compactId() {
    return "" + this.id + "." + this.seq + "." + this.ver;
  }

  compact() {
    return { id: this.id, seq: this.seq, ver: this.ver, data: this.data, next: this.next }
    // return { id: this.id, seq: this.seq, ver: this.ver, data: this.data, next: this.next.map((f) => f.compactId) }
  }

  // static parseCompact(t) {
  //   let v = t.split('.');
  //   return { id: v[0], seq: parseInt(v[1]), ver: parseInt(v[2]) };
  // }

}

class List {
  constructor(id) {
    this.id = id;
    this.seq = 0;
    this.ver = 0;
    this._items = [];
    this._currentBatch = [];
    this._referenced = [];
  }

  static fromJson(json) {
    let list = new List(json.id);
    list.seq = json.seq;
    list.ver = json.ver;
    // list._items = json.items.map((f) => new Node(f.id, f.seq, f.ver, f.data, f.next));
    list._items = _.uniqWith(json.items.map((f) => {
      // console.log(JSON.stringify(f.next, null, 2));
      return new Node(f.id, f.seq, f.ver, f.data, f.next);
    }), _.isEqual);
    return list;
  }

  get items() {
    return this._items.concat(this._currentBatch);
  }

  toJson() {
    return {
      id: this.id,
      seq: this.seq,
      ver: this.ver,
      items: this._currentBatch.map((f) => f.compact())
    }
  }

  toString() {
    const items = this.items.map((f) => JSON.stringify(f.compact())).join("\n");
    return `
      id: ${this.id},
      seq: ${this.seq},
      ver: ${this.ver},
      items: \n${items}
    `
  }

  add(data) {
    // var ii = this.items.map((f) => f.compact());
    // console.log("--->", this.seq, this.ver)
    const heads = this._findHeads(this.items);//.map((f) => f.compact());
    // const heads = this._findHeads(this.items)
    // console.log("jjjj", this._referenced, "\n\n")
    // console.log("jjjj", this.items, "\n\n")
    const node = new Node(this.id, this.seq, this.ver, data, heads);
    // console.log("aaaa", node)
    this._currentBatch.push(node);
    // this._referenced.push(node);
    this.ver ++;
  }

  join(other) {
    let ms;

    if(other.seq && other.seq > this.seq) {
      this.seq = other.seq + 1;
      this.ver = 0;
    } else {
      this.seq = this.seq + 1;
      this.ver = 0;
    }
    // if(other.items.last() && other.items.last().seq > this.seq) {
    //   this.seq = other.seq + 1;
    //   this.ver = 0;
    // }

    // return items that are only in this._currentBatch
    const current = _.differenceWith(this._currentBatch, this._items, this._equals);
    // return items that are only in other.items

    let timer = new Timer(true);
    const others = _.differenceWith(other.items, this._items, this._equals);
    ms = timer.stop(true);
    // return unique items from e and d
    // const final = _.unionWith(others, this._currentBatch, this._equals);
    const final = _.unionWith(current, others, this._equals);
    // append new items to all items
    this._items = this._items.concat(final);

    this._currentBatch = [];
    if(ms > 20) {
      console.log("OVER 20MS!!", other.items.length)
      console.log(`join took ${timer.stop(true)} ms`);
    }
  }

  _findHeads(list) {
    let timer = new Timer(true);
    let ms;
    const grouped = _.groupBy(list, 'id');
    // const heads = Object.keys(grouped).sort((a, b) => a === this.id ? -1 : (a < b ? 1 : 0)).map((g) => grouped[g].last());
    const heads = Object.keys(grouped).map((g) => grouped[g].last());
    // const heads = _.differenceWith(list, this._referenced);
    // console.log("HEADS", JSON.stringify(heads));
    // const cleaned = heads.filter((e) => !this._isReferencedInChain(list, e, this._referenced, 0));
    const cleaned = heads.filter((e) => !this._isReferencedInChain2(list, e));
    // const cleaned = heads;
    // console.log("CLEANED", JSON.stringify(cleaned), "\n");
    // this._referenced = [];
    ms = timer.stop(true);
    if(ms > 20) {
      console.log("OVER 20MS!!")
      console.log(`_findHeads took ${ms} ms`);
    }
    // console.log(`_findHeads took ${ms} ms`);
    return cleaned;
  }


  _isReferencedInChain2(all, item) {
    // console.log("item:", item);
    let isReferenced = all.find((e) => this._references(e, item)) !== undefined;
    if(!isReferenced) {
      // console.log("check children", item.next)
      let childHasRef = item.next.map((f) => {
        const next = all.find((e) => this._equals(e, f));
        const res = next ? this._isReferencedInChain2(all, next) : false;
        return _.find(res, (e) => e === true) !== undefined;
      });
      isReferenced = _.find(childHasRef, (e) => e === true) !== undefined;
      // console.log("children have ref", isReferenced)
    }

    // console.log("red:", isReferenced);
    return isReferenced;
  }

  // _parse(t) {
  //   let v = t.split('.');
  //   return { id: v[0], seq: parseInt(v[1]), ver: parseInt(v[2]) };
  // }

  _equals(a, b) {
    return a.id == b.id && a.seq == b.seq && a.ver == b.ver;
  }

  _references(a, b) {
    // return _.includes(a.next, b.compactId);
    // faster than _.includes()
    for(let i = 0; i < a.next.length; i ++) {
      if(b.compactId === a.next[i]) return true;
    }
    return false;
  }

/*
  _isReferencedInChain(all, item, next2, refs, depth) {
    console.log("...item:", item);
    depth += 1;
    let timer = new Timer(true);
    let ms;

    if(!item)
      return false;

    // let isReferenced = refs.find((e) => e.id == item.id && e.seq == item.seq && e.ver == item.ver) !== undefined;
    let isReferenced = refs.find((e) => this._equals(e, item)) !== undefined;

    if(isReferenced)
      console.log("ref", item)

    if(isReferenced)
      return true;

    // if(item.id == 'C' && item.seq == 3 && item.ver == 1) {
    //   console.log("!!!!", refs,"\n", item)
    // }
    refs.splice(0, 0, item);

    var check = (o) => {
      const next = all.find((e) => this._equals(e, this._parse(o)));
      if(!next)
        return false;

      return this._isReferencedInChain(all, item, next, refs, depth);
    };

    // refs.push(item);

    // console.log(item.next);
    // let res = item.next.map(this._parse).map(check);
    let res = item.next.map(check);

    if(depth > 5) {
      console.log("WTF!!!", depth, item, refs, res);
    }

    // refs.splice(0, 0, item);

    // if(item.id == 'A' && item.seq == 0 && item.ver == 1) {
    //   console.log("????", isReferenced, refs, "\n\n", item, "\n\n", res)
    // }

    // if(item.id == 'A' && item.seq == 1 && item.ver == 2) {
    //   console.log("+++", res)
    // }

    // const hasRef2 = _.find(res, (e) => e === true) !== undefined;
    // const hasRef2 = res.allEqual(true)

    ms = timer.stop(true);
    if(ms > 20) {
      console.log("OVER 20MS!!", refs.length)
      console.log(`_isReferencedInChain took ${ms} ms`);
    }
    let hasRef2 = _.find(res, (e) => e === true) !== undefined;
    // console.log("...res:", hasRef2, res);
    // if(hasRef2)
    //   refs.splice(0, 0, item);

    return hasRef2;
  }
*/
}

var run = () => {
  var redis = require("redis");
  this.client1 = redis.createClient({ host: "localhost", port: 6379 });
  this.client2 = redis.createClient({ host: "localhost", port: 6379 });
  var hash = "ccc"
  this.client1.subscribe(hash);
  this.client1.subscribe(hash);


  let listA = new List("A");
  let listB = new List("B");
  let listC = new List("C");

  const handleMessage = (hash, event) => {
    const l = List.fromJson(JSON.parse(event));
    // console.log("LIST", l);

    // var l = List.fromJson(JSON.parse(event));
    if(l.id === 'A') {
      listB.join(l);
      listC.join(l);
      // console.log(listB);
    } else if(l.id === 'B') {
      listA.join(l);
      listC.join(l);
      // console.log("ListA:", listA);
    } else if(l.id === 'C') {
      listA.join(l);
      // console.log("LIST", event);
      console.log("Items:", listA.items.length);
      // console.log(JSON.stringify(listA, null, 1));
    }

  }

  this.client1.on("message", handleMessage);
  this.client2.on("message", handleMessage);

  setInterval(() => {
    // listC.join(listB);
    // listC.join(listA);
  }, 5000);

  let h = 0;
  setInterval(() => {
    listC.add("C--"+h);
    this.client2.publish(hash, JSON.stringify(listC.toJson()));
    h++;
  }, 1000);

  let i = 0;
  setInterval(() => {
    let a = 0;
    // for(let a = 0; a < 100; a ++) {
      listB.add("B--"+(i+a));
    // }
    this.client2.publish(hash, JSON.stringify(listB.toJson()));
    i++;
  }, 10);

  let k = 0;
  setInterval(() => {
    listA.add("A--"+k);
    k++;
    listA.add("A--"+k);
    k++;
    listA.add("A--"+k);
    k++;
    this.client2.publish(hash, JSON.stringify(listA.toJson()));
  }, 100);
};

run();

module.exports = {
  Node: Node,
  List: List
};
