import util from 'util'
import zlib from 'zlib'
import compress, {decompress} from '../index'

describe('compress', () => {
  it('should return a stream transform', () => {
    const compression = compress()
    expect(typeof (compression && compression._transform)).toBe('function')
    expect(compression._transform.length).toBe(3)
  })

  it('should extend the file name\'s extension', () => {
    const compression1 = compress()
    const callback = jest.fn()
    const file = {
      extname: '.js',
      isBuffer: () => false,
      isNull: () => true,
      isStream: () => false,
    }
    compression1._transform(file, 'utf-8', callback)
    expect(file.extname).toBe('.js.br')
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(null, file)

    const file2 = {
      ...file,
      get file() {
        throw new Error('This error must not cause any issue')
      },
    }
    compression1._transform(file2, 'utf-8', callback)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith(null, file2)

    const compression2 = compress({
      extension: 'stuff',
    })
    file.extname = '.js'
    compression2._transform(file, 'utf-8', callback)
    expect(file.extname).toBe('.js.stuff')
    expect(callback).toHaveBeenCalledTimes(3)
    expect(callback).toHaveBeenLastCalledWith(null, file)
  })

  it('should compress streams', () => {
    const result = {}
    const file = {
      contents: {
        pipe: jest.fn().mockReturnValue(result),
      },
      extname: '.js',
      isBuffer: () => false,
      isNull: () => false,
      isStream: () => true,
    }
    const callback = jest.fn()
    compress()._transform(file, 'utf-8', callback)
    expect(callback).toHaveBeenLastCalledWith(null, file)
    expect(file.contents).toBe(result)
  })

  it('should compress buffers', async () => {
    const input = new Buffer('foo bar baz', 'utf-8')
    const file = {
      contents: input,
      extname: '.js',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }

    const compressedFile = await new Promise<{contents: Buffer}>((resolve, reject) => {
      compress()._transform(file, 'utf-8', (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
    const decompressed = await util.promisify(zlib.brotliDecompress)(compressedFile.contents)
    expect(compressedFile.contents.toString('binary')).not.toBe(input.toString('binary'))
    expect(decompressed.toString('utf-8')).toBe('foo bar baz')
  })

  it('should not output the compressed file if it is larger than the input if skipLarger is true', async () => {
    const input = new Buffer('00', 'utf-8')
    const file = {
      contents: input,
      extname: '.js',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }

    const compressedFile = await new Promise<undefined | {contents: Buffer}>((resolve, reject) => {
      compress({skipLarger: true})._transform(file, 'utf-8', (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
    expect(compressedFile).toBe(undefined)
  })

  it('should output the compressed file even if its larger if skipLarger is not set or false', async () => {
    const input = new Buffer('00', 'utf-8')
    const file = {
      contents: input,
      extname: '.js',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }

    const compressedFile = await new Promise<undefined | {contents: Buffer}>((resolve, reject) => {
      compress({skipLarger: false})._transform(file, 'utf-8', (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
    expect(compressedFile).not.toBeUndefined()
    expect(compressedFile!.contents.length).toBeGreaterThan(input.length)
    const decompressed = await util.promisify(zlib.brotliDecompress)(compressedFile!.contents)
    expect(decompressed.toString('utf-8')).toBe('00')

    const compressedFile2 = await new Promise<undefined | {contents: Buffer}>((resolve, reject) => {
      compress({})._transform(file, 'utf-8', (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
    expect(compressedFile2).not.toBeUndefined()
    expect(compressedFile2!.contents.length).toBeGreaterThan(input.length)
  })

  it('should provide the compress property that is the same function as the main export', () => {
    expect(compress.compress).toBe(compress)
  })
})

describe('decompress', () => {
  it('should ignore null files', () => {
    const callback = jest.fn()
    const file = Object.freeze({
      contents: null,
      extname: '.js',
      isBuffer: () => false,
      isNull: () => true,
      isStream: () => false,
    })
    decompress()._transform(file, 'utf-8', callback)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith(null, file)
  })

  it('should decompress streams', async () => {
    const result = {}
    const file = {
      contents: {
        pipe: jest.fn().mockReturnValue(result),
      },
      extname: '.js.br',
      isBuffer: () => false,
      isNull: () => false,
      isStream: () => true,
    }
    const callback = jest.fn()
    decompress()._transform(file, 'utf-8', callback)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith(null, file)
    expect(file.contents).toBe(result)
  })

  it('should decompress buffered files', async () => {
    const input = await util.promisify(zlib.brotliCompress)(new Buffer('foo bar baz', 'utf-8'))
    const file = {
      contents: input,
      extname: '.js.br',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }

    const decompressedFile = await util.promisify(decompress()._transform)(file, 'utf-8')
    expect(decompressedFile.contents.toString('binary')).not.toBe(input.toString('binary'))
    expect(decompressedFile.contents.toString('utf-8')).toBe('foo bar baz')
  })

  it('should strip the default extension if not overridden', async () => {
    const file1 = {
      contents: await util.promisify(zlib.brotliCompress)(new Buffer('foo bar baz', 'utf-8')),
      extname: '.js.br',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }
    const decompressedFile1 = await util.promisify(decompress()._transform)(file1, 'utf-8')
    expect(decompressedFile1.extname).toBe('.js')

    const file2 = {
      contents: await util.promisify(zlib.brotliCompress)(new Buffer('foo bar baz', 'utf-8')),
      extname: '.js.brotli',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }
    const decompressedFile2 = await util.promisify(decompress()._transform)(file2, 'utf-8')
    expect(decompressedFile2.extname).toBe('.js.brotli')
  })

  it('should strip the configured extension', async () => {
    const file1 = {
      contents: await util.promisify(zlib.brotliCompress)(new Buffer('foo bar baz', 'utf-8')),
      extname: '.js.br',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }
    const decompressedFile1 = await util.promisify(decompress({extension: 'brotli'})._transform)(file1, 'utf-8')
    expect(decompressedFile1.extname).toBe('.js.br')

    const file2 = {
      contents: await util.promisify(zlib.brotliCompress)(new Buffer('foo bar baz', 'utf-8')),
      extname: '.js.brotli',
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }
    const decompressedFile2 = await util.promisify(decompress({extension: 'brotli'})._transform)(file2, 'utf-8')
    expect(decompressedFile2.extname).toBe('.js')
  })

  it('should not fail if the file extension cannot be get/set', async () => {
    const file = {
      contents: await util.promisify(zlib.brotliCompress)(new Buffer('foo bar baz', 'utf-8')),
      get extname() {
        throw new TypeError('This must not cause the test to fail')
      },
      set extname(_value) { // tslint:disable-line:variable-name
        throw new TypeError('This must not cause the test to fail')
      },
      isBuffer: () => true,
      isNull: () => false,
      isStream: () => false,
    }
    return util.promisify(decompress()._transform)(file, 'utf-8')
  })
})
