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
      flush(data) {
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
      assert(err.message === 'Can\'t find method unknown on target');
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

});
