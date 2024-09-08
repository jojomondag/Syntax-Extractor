const vscode = require('vscode');
const { extractCode } = require('./commands/codeExtractor');
const path = require('path');
const fs = require('fs');

let panel = undefined;

function activate(context) {
    console.log('Syntax Extractor is now active!');

    let extractCodeDisposable = vscode.commands.registerCommand('syntaxExtractor.extractCode', async (uri, uris) => {
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

    let openWebviewDisposable = vscode.commands.registerCommand('syntaxExtractor.openWebview', () => {
        createOrShowWebview(context.extensionUri);
    });

    const emptyTreeDataProvider = {
        getTreeItem: () => null,
        getChildren: () => []
    };
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: emptyTreeDataProvider });

    context.subscriptions.push(
        treeView.onDidChangeVisibility(e => {
            if (e.visible) {
                vscode.commands.executeCommand('workbench.view.explorer');
                createOrShowWebview(context.extensionUri);
            }
        })
    );

    context.subscriptions.push(extractCodeDisposable, openWebviewDisposable);
}

function createOrShowWebview(extensionUri) {
    if (panel) {
        panel.reveal(vscode.ViewColumn.Two);
    } else {
        panel = vscode.window.createWebviewPanel(
            'syntaxExtractorWebview',
            'Syntax Extractor',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        panel.webview.html = getWebviewContent(panel.webview, extensionUri);

        panel.webview.onDidReceiveMessage(
            message => handleWebviewMessage(message),
            undefined,
            panel.webview
        );

        panel.onDidDispose(
            () => {
                panel = undefined;
            },
            null,
            panel
        );
    }
}

function getWebviewContent(webview, extensionUri) {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.html');
    const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.css'));

    return htmlContent
        .replace('${scriptUri}', scriptUri)
        .replace('${styleUri}', styleUri);
}

function handleWebviewMessage(message) {
    // Handle messages from the webview
    switch (message.command) {
        case 'setCompressionLevel':
            // Update compression level
            break;
        case 'updateFileTypes':
            // Update file types
            break;
        // Add more cases as needed
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};