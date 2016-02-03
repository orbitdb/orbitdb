'use strict';

class Timer {
  constructor(startImmediately) {
    this.startTime = startImmediately ? new Date().getTime() : null;
    this.endTime   = null;
  }

  start() {
    this.startTime = new Date().getTime();
  }

  stop() {
    this.endTime = new Date().getTime();
    return (this.endTime - this.startTime);
  }
}

module.exports = Timer;