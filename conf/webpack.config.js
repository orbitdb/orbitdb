'use strict'

const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/OrbitDB.js',
  mode: 'production',
  output: {
    libraryTarget: 'var',
    library: 'OrbitDB',
    filename: '../dist/orbitdb.min.js'
  },
  target: 'web',
  externals: {
    fs: '{}',
    mkdirp: '{}'
  },
  plugins: [
    new webpack.DefinePlugin({
      process: {
        env: {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV),
          NODE_DEBUG: JSON.stringify(process.env.NODE_DEBUG)
        },
        version: []
      }
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ],
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    alias: {
      leveldown: 'level-js'
    },
    fallback: {
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert')
    }
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ]
  }
}
