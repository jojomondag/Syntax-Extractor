const vscode = require('vscode');
const { extractCode } = require('./commands/codeExtractor');

// Function to activate the extension
function activate(context) {
    console.log('Syntax Extractor is now active!');

    // Register command to support multi-selection in Explorer view
    let disposable = vscode.commands.registerCommand('codeExtractor.extractCode', async (uri, uris) => {
        // Ensure we handle both single and multiple selections
        if (!uris || uris.length === 0) {
            if (uri) {
                uris = [uri]; // Convert single selection to an array
            } else {
                vscode.window.showWarningMessage('No folders or files selected for extraction.');
                return;
            }
        }

        // Pass the array of URIs to the extractCode function
        await extractCode(uris);
    });

    context.subscriptions.push(disposable);
}

// Function to deactivate the extension
function deactivate() {}

module.exports = {
    activate,
    deactivate
};