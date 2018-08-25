'use strict';

const assert = require('assert');
const Event = require('events');
const is = require('is-type-of');
const sleep = require('mz-modules/sleep');
const awaitEvent = require('await-event');

const defaultOptions = {
  target: null,
  interval: 1000,
  max: 1000,
  logger: console,
  flush: '',
  intercept: '',
  close: '',
  interceptTransform: null,
};

class AggregateClass extends Event {
  constructor(options) {
    super();

    this.options = { ...defaultOptions, ...options };

    assert(this.options.target, 'target is required');
    assert(this.options.flush, 'flush is required');
    assert(this.options.target[this.options.flush],
      `Can't find method ${this.options.flush} on target`);
    if (this.options.close) {
      assert(is.asyncFunction(this.options.target[this.options.close]),
        `method ${this.options.close} should be async function on target`);
    }

    this.cache = [];
    this.startInterval();
  }

  async flush() {
    const cache = this.cache;
    this.cache = [];
    try {
      await this.options.target[this.options.flush](cache);
    } catch (err) {
      this.options.logger.error(err);
      this.cache = cache.concat(this.cache);
    }
  }

  startInterval() {
    this.isLoop = true;

    const loop = async () => {
      while (this.isLoop) {
        await sleep(this.options.interval);

        if (!this.cache.length) continue;

        await this.flush();
      }

      // flush all cache before close
      if (this.cache.length) {
        await this.flush();
      }
    };

    loop().then(() => this.emit('close'));
  }

  intercept(...args) {
    const { interceptTransform, target } = this.options;
    if (interceptTransform) {
      args = interceptTransform.apply(target, args);
    }
    this.cache.push(args);
  }

  async close(...args) {
    // stop interval
    this.isLoop = false;

    // wait loop finish
    await awaitEvent(this, 'close');

    // call target close
    await this.options.target[this.options.close](...args);
  }

}

function wrap(Target, options) {
  if (is.class(Target)) {
    class Wrapper extends AggregateClass {
      constructor(o) {
        const target = new Target(o);

        super({ ...options, target });

        return new Proxy(target, {
          get: (target, prop) => {
            switch (prop) {
              case this.options.intercept:
                return this.intercept.bind(this);
              case this.options.close:
                return this.close.bind(this);
              default:
                return target[prop];
            }
          },
        });
      }
    }
    return Wrapper;
  }

}

exports.wrap = wrap;
exports.Aggregate = AggregateClass;
