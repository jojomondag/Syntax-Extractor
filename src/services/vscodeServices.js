const vscode = require('vscode');

module.exports = {
    writeToClipboard: (content) => vscode.env.clipboard.writeText(content),
    showInfoMessage: (message) => vscode.window.showInformationMessage(message),
    showErrorMessage: (message) => vscode.window.showErrorMessage(message)
};