const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './src/OrbitDB.js',
  output: {
    libraryTarget: 'var',
    library: 'OrbitDB',
    filename: './dist/orbitdb.min.js'
  },
  devtool: 'sourcemap',
  node: {
    console: false,
    process: 'mock',
    Buffer: true
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      mangle: false,
      compress: { warnings: false }
    })
  ],
  resolveLoader: {
    modules: [path.join(__dirname, 'node_modules')]
  },
  resolve: {
    modules: [
      path.join(__dirname, 'node_modules')
    ],
    alias: {
      'node_modules': path.join(__dirname + '/node_modules'),
      'fs': path.join(__dirname + '/node_modules', 'html5-fs'),
    }
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: require.resolve('babel-preset-es2015'),
          plugins: require.resolve('babel-plugin-transform-runtime')
        }
      },
      {
        test: /\.js$/,
        include: /node_modules\/(hoek|qs|wreck|boom|ipfs-.+|orbit-db.+|logplease|crdts|promisify-es6)/,
        loader: 'babel',
        query: {
          presets: require.resolve('babel-preset-es2015'),
          plugins: require.resolve('babel-plugin-transform-runtime')
        }
      },
      {
        test: /\.json$/,
        loader: 'json'
      }
    ]
  },
  externals: {
    net: '{}',
    tls: '{}',
    'require-dir': '{}'
  }
}
