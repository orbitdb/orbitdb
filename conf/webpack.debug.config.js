'use strict'

const path = require('path')
const Uglify = require('uglifyjs-webpack-plugin')

module.exports = {
  entry: './src/OrbitDB.js',
  output: {
    libraryTarget: 'var',
    library: 'OrbitDB',
    filename: './dist/orbitdb.js'
  },
  target: 'web',
  devtool: 'none',
  externals: {
    fs: '{}',
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
    ]
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    moduleExtensions: ['-loader']
  },
}
