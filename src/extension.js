const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const tiktoken = require('tiktoken');

const { extractCode } = require('./commands/codeExtractor');

let currentPanel = undefined;
let clipboardListener = undefined;
let encoder = null;

function activate(context) {
    console.log('Syntax Extractor is now active!');

    encoder = tiktoken.get_encoding("cl100k_base");

    registerCommands(context);
    setupTreeView(context);
    setupClipboardListener();
}

function registerCommands(context) {
    const commands = [
        { id: 'codeExtractor.extractCode', handler: (uri, uris) => handleExtractCode(context, uri, uris) },
        { id: 'syntaxExtractor.openExplorer', handler: () => handleOpenExplorer(context) }
    ];

    commands.forEach(cmd => {
        const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
        context.subscriptions.push(disposable);
    });
}

async function handleExtractCode(context, uri, uris) {
    if (!uris || uris.length === 0) {
        uris = uri ? [uri] : [];
    }

    if (uris.length === 0) {
        vscode.window.showWarningMessage('No folders selected for extraction.');
        return;
    }

    const extractedContent = await extractCode(uris);
    updateOrCreateWebview(context, extractedContent);
}

function handleOpenExplorer(context) {
    vscode.commands.executeCommand('workbench.view.explorer');
    showWebview(context);
}

function setupTreeView(context) {
    const emptyTreeDataProvider = {
        getTreeItem: () => null,
        getChildren: () => []
    };

    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: emptyTreeDataProvider });

    treeView.onDidChangeVisibility(e => {
        if (e.visible) {
            vscode.commands.executeCommand('syntaxExtractor.openExplorer');
        }
    });

    context.subscriptions.push(treeView);
}

function updateOrCreateWebview(context, content) {
    if (currentPanel) {
        updateWebviewContent(content);
    } else {
        showWebview(context, () => updateWebviewContent(content));
    }
}

function updateWebviewContent(content) {
    if (currentPanel) {
        const tokenCount = countTokens(content);
        sendMessageToWebview('updateClipboard', { content, tokenCount });
        console.log('Updated existing webview with new content');
    }
}

function countTokens(text) {
    if (!encoder) {
        console.error('Tiktoken encoder not initialized');
        return text.split(/\s+/).length;
    }
    return encoder.encode(text).length;
}

function showWebview(context, callback) {
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
        if (callback) callback();
        return;
    }

    currentPanel = createWebviewPanel(context);
    setupWebviewMessageHandling(context, callback);
    updateClipboardContent();
}

function createWebviewPanel(context) {
    const panel = vscode.window.createWebviewPanel(
        'syntaxExtractorWebview',
        'Syntax Extractor View',
        vscode.ViewColumn.One,
        getWebviewOptions(context)
    );

    panel.webview.html = getWebviewContent(context, panel);

    panel.onDidDispose(() => {
        currentPanel = undefined;
        if (clipboardListener) {
            clipboardListener.dispose();
            clipboardListener = undefined;
        }
    });

    return panel;
}

function getWebviewOptions(context) {
    return {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'))]
    };
}

function setupWebviewMessageHandling(context, callback) {
    currentPanel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
            case 'webviewReady': {
                console.log('Webview is ready');
                const savedHeight = context.globalState.get('textareaHeight', 200);  // Default to 200px
                sendMessageToWebview('setTextareaHeight', { height: savedHeight });
                if (callback) callback();
                break;
            }
            case 'contentChanged': {
                const tokenCount = countTokens(message.content);
                sendMessageToWebview('updateTokenCount', { tokenCount });
                break;
            }
            case 'textareaResized': {
                context.globalState.update('textareaHeight', message.height);
                break;
            }
        }
    });
}

function sendMessageToWebview(command, data) {
    if (currentPanel) {
        currentPanel.webview.postMessage({ command, ...data });
    }
}

function getWebviewContent(context, panel) {
    const webview = panel.webview;
    const basePath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'));
    const htmlPath = vscode.Uri.joinPath(basePath, 'webview.html');

    try {
        let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
        console.log(`Loaded HTML content from: ${htmlPath.fsPath}`);

        const cssFiles = ['variables.css', 'webview.css', 'box.css'];
        cssFiles.forEach(file => {
            const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(basePath, 'styles', file));
            htmlContent = htmlContent.replace(`./styles/${file}`, cssUri.toString());
        });

        return htmlContent;
    } catch (error) {
        console.error(`Error reading webview.html: ${error.message}`);
        return `<html><body><h1>Error loading webview content</h1><p>${error.message}</p></body></html>`;
    }
}

function setupClipboardListener() {
    if (clipboardListener) {
        clipboardListener.dispose();
    }

    clipboardListener = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.uri.scheme === 'clipboard') {
            updateClipboardContent();
        }
    });
}

function updateClipboardContent() {
    if (currentPanel) {
        vscode.env.clipboard.readText().then(text => {
            const tokenCount = countTokens(text);
            sendMessageToWebview('updateClipboard', { content: text, tokenCount });
        });
    }
}

function deactivate() {
    if (clipboardListener) {
        clipboardListener.dispose();
    }
    if (encoder) {
        encoder.free();
    }
}

module.exports = { activate, deactivate };