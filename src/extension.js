const vscode = require('vscode');
const { extractCode } = require('./commands/codeExtractor');

let panel = undefined;

function activate(context) {
    console.log('Syntax Extractor is now active!');

    // Register the extract code command (existing functionality)
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

    // Register the command to open the explorer and webview
    let openExplorerAndWebviewDisposable = vscode.commands.registerCommand('syntaxExtractor.openExplorer', () => {
        vscode.commands.executeCommand('workbench.view.explorer');
        createOrShowWebview(context.extensionUri);
    });

    // Add event listener for tree view visibility change
    context.subscriptions.push(
        treeView.onDidChangeVisibility(e => {
            if (e.visible) {
                // When our empty view becomes visible, open the explorer and webview
                vscode.commands.executeCommand('syntaxExtractor.openExplorer');
            }
        })
    );

    context.subscriptions.push(extractCodeDisposable, openExplorerAndWebviewDisposable);
}

function createOrShowWebview(extensionUri) {
    if (panel) {
        // If we already have a panel, show it in the target column
        panel.reveal(vscode.ViewColumn.Two);
    } else {
        // Otherwise, create a new panel
        panel = vscode.window.createWebviewPanel(
            'syntaxExtractorSettings',
            'Syntax Extractor Settings',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        // Set the HTML content
        panel.webview.html = getWebviewContent();

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            panel.webview
        );

        // Reset when the panel is closed
        panel.onDidDispose(
            () => {
                panel = undefined;
            },
            null,
            panel
        );
    }
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Syntax Extractor Settings</title>
    </head>
    <body>
        <h1>Syntax Extractor Settings</h1>
        <p>Configure your settings here.</p>
        <!-- Add your settings UI here -->
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};