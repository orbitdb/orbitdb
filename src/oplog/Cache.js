'use strict';

const fs     = require('fs');
const path   = require('path');
const logger = require('logplease').create("orbit-db.Cache");

// const defaultFilepath = path.resolve('./orbit-db-cache.json');
// let filePath = defaultFilepath;
let filePath;
let cache = {};

class Cache {
  static set(key, value) {
    cache[key] = value;
    if(filePath)
      fs.writeFileSync(filePath, JSON.stringify(cache, null, 2) + "\n");
  }

  static get(key) {
    return cache[key];
  }

  static loadCache(cacheFile) {
    // filePath = cacheFile ? cacheFile : defaultFilepath;
    if(cacheFile && fs.existsSync(cacheFile)) {
      filePath = cacheFile;
      logger.debug('Load cache from ' + cacheFile);
      cache = JSON.parse(fs.readFileSync(cacheFile));
    }
  }
}

module.exports = Cache;