'use strict'

const path = require('path')

module.exports = {
  entry: './src/OrbitDB.js',
  output: {
    libraryTarget: 'var',
    library: 'OrbitDB',
    filename: '../dist/orbitdb.js'
  },
  target: 'web',
  devtool: 'source-map',
  externals: {
    fs: '{}',
    mkdirp: '{}',
  },
  node: {
    console: false,
    Buffer: true
  },
  plugins: [
  ],
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    alias: {
      leveldown: 'level-js',
    },
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    moduleExtensions: ['-loader']
  },
}
