'use strict';

const fs     = require('fs');
const path   = require('path');
const logger = require('orbit-common/lib/logger')("orbit-db.Cache");

const defaultFilepath = path.resolve('./orbit-db-cache.json');
let filePath = defaultFilepath;
let cache = {};

class Cache {
  static set(key, value) {
    cache[key] = value;
    fs.writeFile(filePath, JSON.stringify(cache, null, 2) + "\n", (err) => {
      if (err) throw err;
    });
  }

  static get(key) {
    return cache[key];
  }

  static loadCache(cacheFile) {
    filePath = cacheFile ? cacheFile : defaultFilepath;
    if(fs.existsSync(filePath)) {
      logger.debug('Load cache from', filePath);
      cache = JSON.parse(fs.readFileSync(filePath));
    }
  }
}

module.exports = Cache;