const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/OrbitDB.js',
  output: {
    libraryTarget: 'var',
    library: 'OrbitDB',
    filename: './dist/orbitdb.min.js'
  },
  node: {
    console: false,
    process: 'mock',
    Buffer: 'buffer'
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      mangle: false,
      compress: { warnings: false }
    })
  ],
  resolveLoader: {
    root: path.join(__dirname, 'node_modules')
  },
  resolve: {
    modulesDirectories: [
      path.join(__dirname, 'node_modules')
    ],
    alias: {
      fs: require.resolve('./node_modules/logplease/src/fs-mock'),
      http: 'stream-http',
      https: 'https-browserify',
      Buffer: 'buffer'
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
      include: /node_modules\/(hoek|qs|wreck|boom|ipfs-.+|orbit-db-.+|logplease|crdts)/,
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
};
