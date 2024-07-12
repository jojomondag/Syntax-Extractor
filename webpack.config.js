const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
  {
    mode: 'production',
    target: 'node',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode',
    },
    resolve: {
      extensions: ['.ts', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
      ],
    },
  },
  {
    mode: 'production',
    target: 'web',
    entry: './src/webview/webview.ts',
    output: {
      path: path.resolve(__dirname, 'out/webview'),
      filename: 'webview.js',
      libraryTarget: 'umd',
      globalObject: 'this',
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/webview/webview.html', to: 'webview.html' },
          { from: 'src/webview/styles/webview.css', to: 'webview.css' },
          { from: 'src/webview/styles/variables.css', to: 'variables.css' },
        ],
      }),
    ],
  },
];