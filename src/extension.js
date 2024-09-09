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

    // Initialize the tiktoken encoder
    encoder = tiktoken.get_encoding("cl100k_base");  // This is suitable for GPT-3.5 and GPT-4

    let extractCodeDisposable = vscode.commands.registerCommand('codeExtractor.extractCode', async (uri, uris) => {
        if (!uris || uris.length === 0) {
            if (uri) {
                uris = [uri];
            } else {
                vscode.window.showWarningMessage('No folders selected for extraction.');
                return;
            }
        }
        const extractedContent = await extractCode(uris);
        updateOrCreateWebview(context, extractedContent);
    });

    let openExplorerDisposable = vscode.commands.registerCommand('syntaxExtractor.openExplorer', () => {
        vscode.commands.executeCommand('workbench.view.explorer');
        showWebview(context);
    });

    const emptyTreeDataProvider = {
        getTreeItem: () => null,
        getChildren: () => []
    };
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: emptyTreeDataProvider });

    context.subscriptions.push(
        treeView.onDidChangeVisibility(e => {
            if (e.visible) {
                vscode.commands.executeCommand('syntaxExtractor.openExplorer');
            }
        })
    );

    context.subscriptions.push(extractCodeDisposable, openExplorerDisposable);

    // Set up clipboard listener
    setupClipboardListener();
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
        currentPanel.webview.postMessage({ 
            command: 'updateClipboard', 
            content: content,
            tokenCount: tokenCount
        });
        console.log('Updated existing webview with new content');
    }
}

function countTokens(text) {
    if (!encoder) {
        console.error('Tiktoken encoder not initialized');
        return text.split(/\s+/).length; // Fallback to simple word count
    }
    const tokens = encoder.encode(text);
    return tokens.length;
}

function showWebview(context, callback) {
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
        if (callback) callback();
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'syntaxExtractorWebview',
        'Syntax Extractor View',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'))]
        }
    );

    const webviewHtml = getWebviewContent(context, currentPanel);
    currentPanel.webview.html = webviewHtml;

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
        if (clipboardListener) {
            clipboardListener.dispose();
            clipboardListener = undefined;
        }
    });

    // Wait for the webview to be ready
    currentPanel.webview.onDidReceiveMessage(message => {
        if (message.command === 'webviewReady') {
            console.log('Webview is ready');
            if (callback) callback();
        }
    });

    // Initial clipboard content
    updateClipboardContent();
}

function getWebviewContent(context, panel) {
    const webview = panel.webview;
    const basePath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'));

    // Read the HTML content from `webview.html`
    const htmlPath = vscode.Uri.joinPath(basePath, 'webview.html');
    let htmlContent;
    try {
        htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
        console.log(`Loaded HTML content from: ${htmlPath.fsPath}`);
    } catch (error) {
        console.error(`Error reading webview.html: ${error.message}`);
        return `<html><body><h1>Error loading webview content</h1><p>${error.message}</p></body></html>`;
    }

    // Load CSS files with appropriate URIs for the webview
    const variablesCssUri = webview.asWebviewUri(vscode.Uri.joinPath(basePath, 'styles', 'variables.css'));
    const webviewCssUri = webview.asWebviewUri(vscode.Uri.joinPath(basePath, 'styles', 'webview.css'));
    const boxCssUri = webview.asWebviewUri(vscode.Uri.joinPath(basePath, 'styles', 'box.css'));

    console.log(`CSS URIs: ${variablesCssUri}, ${webviewCssUri}, ${boxCssUri}`);

    // Update the HTML content to include the stylesheets dynamically
    htmlContent = htmlContent.replace('./styles/variables.css', variablesCssUri.toString());
    htmlContent = htmlContent.replace('./styles/webview.css', webviewCssUri.toString());
    htmlContent = htmlContent.replace('./styles/box.css', boxCssUri.toString());

    return htmlContent;
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
            currentPanel.webview.postMessage({ 
                command: 'updateClipboard', 
                content: text,
                tokenCount: tokenCount
            });
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

module.exports = {
    activate,
    deactivate
};