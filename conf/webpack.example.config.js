const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './examples/browser/index.js',
  output: {
    filename: './examples/browser/bundle.js'
  },
  devtool: 'sourcemap',
  node: {
    console: false,
    process: 'mock',
    Buffer: true
  },
  plugins: [
    // new webpack.optimize.UglifyJsPlugin({
    //   mangle: false,
    //   compress: { warnings: false }
    // })
  ],
  resolve: {
    modules: [
      path.join(__dirname, '../node_modules')
    ]
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: require.resolve('babel-preset-es2015'),
          plugins: require.resolve('babel-plugin-transform-runtime')
        }
      },
      {
        test: /\.js$/,
        include: /node_modules\/(hoek|qs|wreck|boom|ipfs.+|orbit.+|logplease|crdts|promisify-es|whatwg-fetch|node-fetch|isomorphic-fetch|db\.js)/,
        loader: 'babel-loader',
        query: {
          presets: require.resolve('babel-preset-es2015'),
          plugins: require.resolve('babel-plugin-transform-runtime')
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  },
  externals: {
    net: '{}',
    tls: '{}',
    'require-dir': '{}'
  }
}
