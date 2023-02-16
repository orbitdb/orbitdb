import glob from 'glob'
import webpack from 'webpack'
import { createRequire } from 'module'

export default (env, argv) => {
  const require = createRequire(import.meta.url)
  return {
    // TODO: put all tests in a .js file that webpack can use as entry point
    entry: glob.sync('./test/*.spec.js', { ignore: ['./test/replicate.spec.js'] }),
    output: {
      filename: '../test/browser/bundle.js'
    },
    target: 'web',
    mode: 'development',
    devtool: 'source-map',
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser.js',
        Buffer: ['buffer', 'Buffer']
      })
    ],
    experiments: {
      topLevelAwait: true
    },
    resolve: {
      modules: [
        'node_modules'
      ],
      fallback: {
        path: require.resolve('path-browserify'),
        os: false,
        fs: false,
        constants: false,
        stream: false
      }
    },
    externals: {
      fs: '{ existsSync: () => true }',
      'fs-extra': '{ copy: () => {} }',
      rimraf: '{ sync: () => {} }'
    },
    module: {
      rules: [
      ]
    }
  }
}
