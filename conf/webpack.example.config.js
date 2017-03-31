'use strict'

const path = require('path')
const webpack = require('webpack')
const Uglify = require('uglifyjs-webpack-plugin')

const uglifyOptions = {
  uglifyOptions: {
    mangle: false,
  },
}

module.exports = {
  entry: './examples/browser/browser-webpack-example/index.js',
  output: {
    filename: './examples/browser/browser-webpack-example/bundle.js'
  },
  target: 'web',
  devtool: 'none',
  node: {
    console: false,
    Buffer: true,
    process: 'mock',
  },
  externals: {
    fs: '{}',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new Uglify(uglifyOptions),
  ],
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    moduleExtensions: ['-loader']
  },
}
