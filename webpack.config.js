//@ts-check

'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a node context
    entry: './src/extension.ts', // entry point of the extension
    output: {
        // bundle output
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded
    },
    resolve: {
        // support reading TypeScript and JavaScript files, refer to webpack docs
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
    optimization: {
        minimize: false // disable minification to make debugging easier
    },
    // Exclude node_modules from the bundle - this is key for reducing file count
    externalsType: 'commonjs'
};

module.exports = config;