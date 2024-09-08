const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/extension.js',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/webview/webview.html', to: 'webview/webview.html' },
        { from: 'src/webview/styles/webview.css', to: 'webview/webview.css' },
        { from: 'src/webview/webview.js', to: 'webview/webview.js' },
        { from: 'resources/SyntaxExtractor256x256.png', to: 'resources/SyntaxExtractor256x256.png' }
      ],
    }),
  ]
};