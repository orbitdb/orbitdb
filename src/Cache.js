'use strict';

const fs = require('fs');
const path = require('path');

const defaultFilename = 'orbit-db-cache.json';
let cache = {};

class Cache {
  static set(key, value) {
    cache[key] = value;
    fs.writeFile(path.resolve(defaultFilename), JSON.stringify(cache, null, 2) + "\n", (err) => {
      if (err) throw err;
      // console.log('It\'s saved!', path.resolve(defaultFilename));
    });
  }

  static get(key) {
    return cache[key];
  }

  static loadCache(cacheFile) {
    cacheFile = cacheFile ? cacheFile : defaultFilename;
    if(fs.existsSync(path.resolve(defaultFilename))) {
      console.log('Load cache from', path.resolve(defaultFilename));
      cache = JSON.parse(fs.readFileSync(path.resolve(defaultFilename)));
    }
  }
}

module.exports = Cache;