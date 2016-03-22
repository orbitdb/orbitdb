'use strict';

const fs = require('fs');
const path = require('path');

const filename = 'orbit-db-cache.json';
let cache = {};

class Cache {
  static set(key, value) {
    cache[key] = value;
    fs.writeFile(path.resolve(filename), JSON.stringify(cache, null, 2) + "\n", (err) => {
      if (err) throw err;
      // console.log('It\'s saved!', path.resolve(filename));
    });
  }

  static get(key) {
    return cache[key];
  }

  static loadCache() {
    if(fs.existsSync(path.resolve(filename))) {
      console.log('Load cache from', path.resolve(filename));
      cache = JSON.parse(fs.readFileSync(path.resolve(filename)));
    }
  }
}

module.exports = Cache;