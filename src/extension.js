const vscode = require('vscode');
const { extractCode } = require('./commands/codeExtractor');

function activate(context) {
    console.log('Syntax Extractor is now active!');

    // Register the extract code command
    let extractCodeDisposable = vscode.commands.registerCommand('codeExtractor.extractCode', async (uri, uris) => {
        if (!uris || uris.length === 0) {
            if (uri) {
                uris = [uri];
            } else {
                vscode.window.showWarningMessage('No folders selected for extraction.');
                return;
            }
        }
        await extractCode(uris);
    });

    // Create and register the empty tree view
    const emptyTreeDataProvider = {
        getTreeItem: () => null,
        getChildren: () => []
    };
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: emptyTreeDataProvider });

    // Register the command to open the explorer when the empty view becomes visible
    let openExplorerDisposable = vscode.commands.registerCommand('syntaxExtractor.openExplorer', () => {
        vscode.commands.executeCommand('workbench.view.explorer');
    });

    // Add event listener for tree view visibility change
    context.subscriptions.push(
        treeView.onDidChangeVisibility(e => {
            if (e.visible) {
                vscode.commands.executeCommand('syntaxExtractor.openExplorer');
            }
        })
    );

    context.subscriptions.push(extractCodeDisposable, openExplorerDisposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};