import compress from '../index'
import util from 'util'
import zlib from 'zlib'

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
})
