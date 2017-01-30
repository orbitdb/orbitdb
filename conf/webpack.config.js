'use strict'

const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './src/OrbitDB.js',
  output: {
    libraryTarget: 'var',
    library: 'OrbitDB',
    filename: './dist/orbitdb.min.js'
  },
  devtool: 'source-map',
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ]
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    moduleExtensions: ['-loader']
  },
  node: {
    console: false,
    Buffer: true
  },
  plugins: [],
  target: 'web'
}
