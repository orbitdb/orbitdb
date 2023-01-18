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
        // {
        //   test: /\.m?js$/,
        //   exclude: /node_modules/,
        //   use: {
        //     loader: 'babel-loader',
        //     options: {
        //       presets: ['@babel/preset-env'],
        //       plugins: ['@babel/plugin-syntax-import-assertions']
        //     }
        //   }
        // },
        {
          // For inlining the fixture keys in browsers tests
          test: /userA|userB|userC|userD|0358df8eb5def772917748fdf8a8b146581ad2041eae48d66cc6865f11783499a6|032f7b6ef0432b572b45fcaf27e7f6757cd4123ff5c5266365bec82129b8c5f214|02a38336e3a47f545a172c9f77674525471ebeda7d6c86140e7a778f67ded92260|03e0480538c2a39951d054e17ff31fde487cb1031d0044a037b53ad2e028a3e77c$/,
          loader: 'json-loader'
        }
      ]
    }
  }
}
