const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');
const copyPlugin = require('copy-webpack-plugin');

const extensionConfig = {
    target: 'node',
    mode: 'development',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        publicPath: './',
    },
    externals: {
        vscode: 'commonjs vscode',
    },
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
        ],
    },
    devtool: 'source-map',
    optimization: {
        minimize: true,
        usedExports: true,
    },
};

const webviewConfig = {
    target: 'web',
    mode: 'development',
    entry: './src/webview/webview.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'webview.js',
        libraryTarget: 'umd',
        globalObject: 'this',
        publicPath: './',
    },
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
    devtool: 'source-map',
    plugins: [
        new htmlWebpackPlugin({
            template: './src/webview/webview.html',
            filename: 'webview/webview.html',
            chunks: ['webview'],
            inject: 'head',
        }),
        new copyPlugin({
            patterns: [
                { from: 'src/resources', to: 'resources' },
                { from: 'src/config/fileTypesToRead.json', to: 'config' },
                { from: 'src/config/config.json', to: 'config' },
            ],
        }),
    ],
};

module.exports = [extensionConfig, webviewConfig];
