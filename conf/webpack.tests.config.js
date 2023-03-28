import glob from 'glob'
import path from 'path'
import webpack from 'webpack'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

export default (env, argv) => {
  const require = createRequire(import.meta.url)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  return {
    entry: glob.sync('./test/**/*.js', { ignore: [] }),
    output: {
      filename: '../test/browser/bundle.js'
    },
    target: 'web',
    mode: 'development',
    devtool: 'source-map',
    experiments: {
      topLevelAwait: true
    },
    externals: {
      fs: '{ existsSync: () => true }',
      'fs-extra': '{ copy: () => {} }',
      rimraf: '() => {}'
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer']
      })
    ],
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ],
      fallback: {
        path: require.resolve('path-browserify'),
        process: false
      }
    },
    resolveLoader: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ],
      extensions: ['.js', '.json'],
      mainFields: ['loader', 'main']
    }
  }
}
