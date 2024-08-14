const vscode = require('vscode');
const { extractCode } = require('./codeExtractor');

function activate(context) {
    let disposable = vscode.commands.registerCommand('codeExtractor.extractCode', extractCode);
    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };