import PluginError from 'plugin-error'
import stream from 'stream'
import through from 'through2'
import zlib from 'zlib'

type CompressFunctionType = typeof compress
interface IExportedApi extends CompressFunctionType {
  compress: CompressFunctionType
}

interface IOptions extends zlib.BrotliOptions {
  extension?: string
  skipLarger?: boolean
}

const PLUGIN_NAME = '@seznam/gulp-brotli'

function compress(options: IOptions = {}): stream.Transform {
  const extension = `.${options.extension || 'br'}`

  // tslint:disable-next-line:variable-name
  return through.obj((file, _encoding, callback) => {
    try {
      file.extname += extension
    } catch (pathNotSetError) {
      // The file's path is not set, therefore this is most likely a virtual in-memory file. Ignore.
    }

    switch (true) {
      case file.isNull():
        callback(null, file)
        break

      case file.isStream():
        const brotliCompression = zlib.createBrotliCompress(options)
        file.contents = file.contents.pipe(brotliCompression)
        callback(null, file)
        break

      case file.isBuffer():
        zlib.brotliCompress(file.contents, options, (error, compressedContents) => {
          if (error) {
            callback(new PluginError(PLUGIN_NAME, error))
            return
          }

          if (!options.skipLarger || compressedContents.length < file.contents.length) {
            file.contents = compressedContents
            callback(null, file)
          } else {
            callback()
          }
        })
        break
    }
  })
}

const exportedApi: IExportedApi = compress.compress = compress

export = exportedApi
