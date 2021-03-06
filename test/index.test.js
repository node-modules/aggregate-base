'use strict';

const assert = require('assert');
const mm = require('mm');
const sleep = require('mz-modules/sleep');
const aggregate = require('..').wrap;

describe('test/index.test.js', () => {
  afterEach(mm.restore);

  it('should work', async () => {
    let logs = [];
    class Logger {
      info(message) {
        logs.push(message);
      }
      flush(data) {
        logs.push(data);
      }
    }

    let logger = new Logger();
    logger.info('a');
    logger.info('b');
    logger.info('c');
    await sleep(100);
    assert.deepEqual(logs, [ 'a', 'b', 'c' ]);

    logs = [];
    const AggregateLogger = aggregate(Logger, {
      interval: 1,
      intercept: 'info',
      flush: 'flush',
    });

    logger = new AggregateLogger();
    logger.info('a');
    logger.info('b');
    logger.info('c');
    await sleep(100);
    assert.deepEqual(logs, [[[ 'a' ], [ 'b' ], [ 'c' ]]]);
  });

  it('should rollback when flush error', async () => {
    let errorMessage = '';
    mm(console, 'error', err => {
      errorMessage = err.message;
    });

    const logs = [];
    class Logger {
      info() {}
      async flush(data) {
        logs.push(data);
      }
    }
    const AggregateLogger = aggregate(Logger, {
      interval: 500,
      intercept: 'info',
      flush: 'flush',
    });
    const logger = new AggregateLogger();
    logger.info('a');

    mm(Logger.prototype, 'flush', async () => {
      throw new Error('error');
    });
    await sleep(600);
    mm.restore();

    await sleep(600);
    assert.deepEqual(logs, [[[ 'a' ]]]);
    assert(errorMessage === 'error');
  });

  it('should check flush method', () => {
    const Class = aggregate(class {}, {
      interval: 500,
      flush: 'unknown',
    });

    try {
      new Class();
      throw new Error('should not run');
    } catch (err) {
      assert(err.message === 'method unknown should be function on target');
    }
  });

  it('should access self property', () => {
    class Logger {
      constructor(options) {
        this.options = options;
        this.cache = true;
      }
      flush() {}
    }
    const MyLogger = aggregate(Logger, { flush: 'flush' });
    const logger = new MyLogger({ a: 1 });
    assert.deepEqual(logger.options, { a: 1 });
    assert(logger.cache === true);
  });

  it('should wait flush after close', async () => {
    const logs = [];
    let isClose = false;
    class Logger {
      constructor(options) {
        this.options = options;
        this.cache = true;
      }
      info() {}
      flush(data) {
        logs.push(data);
      }
      async close() {
        isClose = true;
      }
    }
    const MyLogger = aggregate(Logger, {
      interval: 1000,
      intercept: 'info',
      flush: 'flush',
      close: 'close',
    });
    const logger = new MyLogger({ a: 1 });
    logger.info('a');
    logger.info('a');

    await logger.close();
    assert(isClose === true);
    assert.deepEqual(logs, [[[ 'a' ], [ 'a' ]]]);
  });

  it('should wait flush without cache after close', async () => {
    const logs = [];
    let isClose = false;
    class Logger {
      constructor(options) {
        this.options = options;
        this.cache = true;
      }
      info() {}
      flush(data) {
        logs.push(data);
      }
      async close() {
        isClose = true;
      }
    }
    const MyLogger = aggregate(Logger, {
      interval: 1000,
      intercept: 'info',
      flush: 'flush',
      close: 'close',
    });
    const logger = new MyLogger({ a: 1 });
    logger.info('a');
    await sleep(1000);

    await logger.close();
    assert(isClose === true);
    assert.deepEqual(logs, [[[ 'a' ]]]);
  });

  it('should be transformed when intercept', async () => {
    const logs = [];
    class Logger {
      get data() {
        return 'a';
      }
      info() {}
      flush(data) {
        logs.push(data);
      }
    }

    const AggregateLogger = aggregate(Logger, {
      interval: 1,
      intercept: 'info',
      interceptTransform(num) {
        if (num === 2) return false;
        return this.data + String(num);
      },
      flush: 'flush',
    });

    const logger = new AggregateLogger();
    logger.info(1);
    logger.info(2);
    logger.info(3);
    await sleep(10);
    assert.deepEqual(logs, [[ 'a1', 'a3' ]]);
  });

  it('should support flush function type', async () => {
    let logs = [];
    class Custom {
      info() {}
      fun1(data) {
        logs.push(data);
      }
      async fun2(data) {
        await sleep(1000);
        logs.push(data);
      }
    }

    const Custom1 = aggregate(Custom, {
      interval: 100,
      intercept: 'info',
      flush: 'fun1',
    });
    const c1 = new Custom1();
    c1.info('a');
    await sleep(200);
    assert.deepEqual(logs, [[[ 'a' ]]]);
    await sleep(1200);
    assert.deepEqual(logs, [[[ 'a' ]]]);

    logs = [];
    const Custom2 = aggregate(Custom, {
      interval: 100,
      intercept: 'info',
      flush: 'fun2',
    });
    const c2 = new Custom2();
    c2.info('a');
    await sleep(200);
    assert.deepEqual(logs, []);
    await sleep(1200);
    assert.deepEqual(logs, [[[ 'a' ]]]);
  });

});
