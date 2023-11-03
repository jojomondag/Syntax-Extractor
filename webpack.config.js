//@ts-check
'use strict';

const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');
const copyPlugin = require('copy-webpack-plugin');

/** @type {import('webpack').Configuration} */
const extensionConfig = {
    target: 'node',
    mode: 'development',
    entry: {
        extension: './src/extension.ts',
        webview: './src/webview/webview.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        publicPath: '',
    },
    externals: {
        vscode: 'commonjs vscode',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    experiments: {
        syncWebAssembly: true, // Enabling WebAssembly support
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: ['ts-loader'],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.wasm$/, // WebAssembly loader
                type: "webassembly/sync",
                parser: {
                    wasm: true,
                },
            },
        ],
    },
    devtool: 'source-map',
    infrastructureLogging: {
        level: "log",
    },
    optimization: {
        minimize: true,
        usedExports: true,
    },
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
                { from: 'node_modules/tiktoken/tiktoken_bg.wasm', to: '.' },
                { from: 'node_modules/tiktoken/lite/tiktoken_bg.wasm', to: 'lite/' }
            ],
        }),
    ],
};

module.exports = [extensionConfig];