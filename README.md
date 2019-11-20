# gulp-brotli

[![Build Status](https://travis-ci.org/seznam/gulp-brotli.svg?branch=master)](https://travis-ci.org/seznam/gulp-brotli)
[![npm](https://img.shields.io/npm/v/@seznam/gulp-brotli.svg)](https://www.npmjs.com/package/@seznam/gulp-brotli)
[![License](https://img.shields.io/npm/l/@seznam/gulp-brotli.svg)](LICENSE)
![npm type definitions](https://img.shields.io/npm/types/@seznam/gulp-brotli.svg)

A gulp plugin for file compression using the brotli compression included in
node.js's zlib native module, without any native or WASM extraneous libraries.

## Installation

`gulp-brotli` is available as npm package, you can use `npm` to install it:

```
npm install --save-dev @seznam/gulp-brotli
```

## Usage

Since `@seznam/gulp-brotli` uses the
[native brotli support in node.js](https://nodejs.org/docs/latest-v10.x/api/zlib.html),
all the native API's options are directly exposed to keep things simple and
flexible. The only extra options are:

* `extension` - specifies the file name extension to add the file names of all
  compressed files (without the leading dot (`.`)). The `extension` option
  is optional and defaults to `br`.
* `skipLarger` - when `true`, any compressed files that would end up being
  larger that their uncompressed versions will be omitted from the output.
  The `skipLarger` option is optional and defaults to `false`. The option is
  ignored for streams.

### Compressing files

```typescript
import gulpBrotli from '@seznam/gulp-brotli'
import gulp from 'gulp'
import zlib from 'zlib'

export function compressBrotli() {
  return gulp
    .src(`path/to/files/to/compress`)
    .pipe(gulpBrotli({
      // the options are document at https://nodejs.org/docs/latest-v10.x/api/zlib.html#zlib_class_brotlioptions 
      params: {
        // brotli parameters are document at https://nodejs.org/docs/latest-v10.x/api/zlib.html#zlib_brotli_constants
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      },
    }))
    .pipe(gulp.dest(`destination/path/which/is/usually/the/source/path`))
}
```

Here's an example showing the `extension` and `skipLarger` options, as well as
the `compress` alias:

```typescript
import gulpBrotli from '@seznam/gulp-brotli'
import gulp from 'gulp'
import zlib from 'zlib'

export function compressBrotli() {
  return gulp
    .src(`path/to/files/to/compress`)
    .pipe(gulpBrotli.compress({
      extension: 'brotli',
      skipLarger: true,
      // the options are document at https://nodejs.org/docs/latest-v10.x/api/zlib.html#zlib_class_brotlioptions 
      params: {
        // brotli parameters are document at https://nodejs.org/docs/latest-v10.x/api/zlib.html#zlib_brotli_constants
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      },
    }))
    .pipe(gulp.dest(`destination/path/which/is/usually/the/source/path`))
}
```

You may use the default configuration by omitting the options object
altogether. The following example shows
[streaming the files](https://github.com/gulpjs/gulp/blob/master/docs/api/src.md#options)
instead of buffering them (the `skipLarger` option would be ignored in this
case):

```typescript
import gulpBrotli from '@seznam/gulp-brotli'
import gulp from 'gulp'
import zlib from 'zlib'

export function compressBrotli() {
  return gulp
    .src(`path/to/files/to/compress`, {buffer: false})
    .pipe(gulpBrotli.compress()) // Or you may use .pipe(gulpBrotli()) instead
    .pipe(gulp.dest(`destination/path/which/is/usually/the/source/path`))
}
```

### Decompressing files

Decompressing files like this will also remove the `.br` file name extension
from the resulting files (unless another extension is specified using the
`extension` option):

```typescript
import gulpBrotli from '@seznam/gulp-brotli'
import gulp from 'gulp'
import zlib from 'zlib'

export function decompressBrotli() {
  return gulp
    .src(`path/to/files/to/compress`)
    .pipe(gulpBrotli.decompress({
      // the options are document at https://nodejs.org/docs/latest-v10.x/api/zlib.html#zlib_class_brotlioptions 
      params: {
        // brotli parameters are document at https://nodejs.org/docs/latest-v10.x/api/zlib.html#zlib_brotli_constants
      },
    }))
    .pipe(gulp.dest(`destination/path/which/is/usually/the/source/path`))
}
```

The options object is optional here as well if you want to use the default
configuration.
