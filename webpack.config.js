//@ts-check
'use strict';

const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');
const copyPlugin = require('copy-webpack-plugin');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
    target: 'node',
    mode: 'production',

    entry: {
        extension: './src/extension.ts',
        webview: './src/webview/webview.ts',
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        publicPath: ''
    },

    externals: {
        vscode: 'commonjs vscode'
    },

    resolve: {
        extensions: ['.ts', '.js']
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }
        ]
    },

    devtool: 'source-map',

    infrastructureLogging: {
        level: "log",
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
            ],
        }),
    ]
};
module.exports = [extensionConfig];