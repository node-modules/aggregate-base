# aggregate-base

Base class for aggregate operation, sush as http request, write file.

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/aggregate-base.svg?style=flat-square
[npm-url]: https://npmjs.org/package/aggregate-base
[travis-image]: https://img.shields.io/travis/node-modules/aggregate-base.svg?style=flat-square
[travis-url]: https://travis-ci.org/node-modules/aggregate-base
[codecov-image]: https://codecov.io/gh/node-modules/aggregate-base/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/node-modules/aggregate-base
[david-image]: https://img.shields.io/david/node-modules/aggregate-base.svg?style=flat-square
[david-url]: https://david-dm.org/node-modules/aggregate-base
[snyk-image]: https://snyk.io/test/npm/aggregate-base/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/aggregate-base
[download-image]: https://img.shields.io/npm/dm/aggregate-base.svg?style=flat-square
[download-url]: https://npmjs.org/package/aggregate-base


## Usage

```bash
npm i aggregate-base --save
```

You can wrap Class for aggregate operation, if you have a Logger that write log to file.

```js
class Logger {
  info(log) {
    this.writeToFile(log);
  }

  writeToFile() {
    // your implementation
  }
}
```

However, it has bad performance that write file system every function call, so you can use this module to merge the operations.

```js
const { wrap } = require('aggregate-base');

class Logger {
  info(log) {
    this.writeToFile(log);
  }

  flush(logs) {
    this.writeToFile(logs.join('\n'));
  }

  writeToFile() {
    // your implementation
  }
}

const WrapLogger = wrap(Logger, {
  interval: 1000,
  intercept: 'info',
  flush: 'flush',
});
```

The module will create a loop (configured by interval), it will collect data by intercepting the specified `intercept` method, and call `flush` method after `interval` with all collected data.

## Options

- interval: the time between flush
- intercept: the intercept method name of class, the method will not be run.
- interceptTransform: the function that can tranform the arguments of intercept method, **if it return false, it won't cache this data**
- flush: the flush method name of class.
- close: the close method name of class, it should be a async function.

## License

[MIT](LICENSE)
