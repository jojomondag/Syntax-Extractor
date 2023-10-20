//@ts-check

'use strict';

const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');
const copyPlugin = require('copy-webpack-plugin');  // Import the copy-webpack-plugin

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
    target: 'node',
    mode: 'production',

    entry: {
        extension: './src/extension.ts',  // existing entry point
        webview: './src/webview/webview.ts'  // new entry point for webview
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',  // updated to handle multiple entry files
        libraryTarget: 'commonjs2',
        publicPath: ''  // Added this line
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
            filename: 'webview.html',
            chunks: ['webview'],
            inject: 'head',  // This ensures the script is placed in the head element
        }),
        new copyPlugin({  // Add this plugin to your plugins array
            patterns: [
                { from: 'src/resources', to: 'resources' },  // adjust this path if your icon is located elsewhere
            ],
        }),
    ]
};

module.exports = [extensionConfig];
