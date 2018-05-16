const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cache.min.js',
    library: 'cachePolyfill',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
    ]
  }
};
