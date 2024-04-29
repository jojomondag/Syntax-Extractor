import * as vscode from 'vscode';
import { extractAndCopyText, extractFileFolderTree, getTokenCount } from './operations';
import { ConfigManager } from './config/ConfigManager';
import { handleOpenWebpage } from './commands/openWebpage';

// Defines a data provider for a tree view, implementing the necessary interfaces for VS Code to render and manage tree items.
class MyDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }
    getChildren(): Thenable<vscode.TreeItem[]> { return Promise.resolve([]); }
}

// Activates the extension, setting up the tree view and command registration.
export function activate(context: vscode.ExtensionContext) {
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: new MyDataProvider() });

    context.subscriptions.push(vscode.commands.registerCommand('extension.createWebview', () => openWebviewAndExplorerSidebar(context)));

    context.subscriptions.push(vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', extractFileFolderTree));
    
    context.subscriptions.push(vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', extractAndCopyText));
    
    treeView.onDidChangeVisibility(({ visible }) => {
        if (visible) {
            openWebviewAndExplorerSidebar(context);
        }
    });
}

// In the old code version, this global reference ensures only one webview instance is managed and reused.
let globalPanel: vscode.WebviewPanel | undefined;

// Opens a webview for displaying web content and then switches to the Explorer sidebar.
function openWebviewAndExplorerSidebar(context: vscode.ExtensionContext) {
    if (globalPanel) {
        globalPanel.reveal(vscode.ViewColumn.One);
    } else {
        globalPanel = vscode.window.createWebviewPanel(
            'webPageView', 'SynExt', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
            }
        );

        // Listen for when the panel is disposed
        // This will be called when the user closes the panel
        console.log('Setting up onDidDispose event');
        globalPanel.onDidDispose(() => {
            console.log('Webview was closed');
            globalPanel = undefined;
        }, null, context.subscriptions);
    
        // Initialize webview content
        (async () => {
            if (globalPanel) {
                globalPanel.webview.html = await composeWebViewContent(globalPanel.webview, context.extensionUri);
            }
        })();
    }

    if (globalPanel) {
        // Apply the setupWebviewPanelActions function to manage state and listen for messages
        setupWebviewPanelActions(globalPanel, context);

        clipBoardPolling(globalPanel);

        // Use the handleReceivedMessage function
        globalPanel.webview.onDidReceiveMessage(
            message => {
                if (globalPanel) { // Additional check for safety
                    handleReceivedMessage(message, globalPanel, context);
                }
            },
            undefined,
            context.subscriptions
        );

        // Optionally send initial configuration to webview
        globalPanel.webview.postMessage({
            command: 'initConfig',
            fileTypes: ConfigManager.getInstance().getFileTypes(),
            compressionLevel: ConfigManager.getInstance().getCompressionLevel(),
            clipboardDataBoxHeight: ConfigManager.getInstance().getClipboardDataBoxHeight()
        });

        // Adjust view as necessary
        vscode.commands.executeCommand('workbench.action.closeSidebar');
        vscode.commands.executeCommand('workbench.view.explorer');
    }
}

// Modified handleReceivedMessage to correctly handle async operations
async function handleReceivedMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    switch (message.command) {
        case 'setCompressionLevel':
            await ConfigManager.getInstance().setCompressionLevel(message.level);
            break;
        case 'setFileTypes':
            await ConfigManager.getInstance().setFileTypes(message.fileTypes);
            break;
        case 'setClipboardDataBoxHeight':
            await ConfigManager.getInstance().setClipboardDataBoxHeight(message.height);
            break;
        case 'openWebpage':
            handleOpenWebpage();
            break;
        case 'countTokens':
            const tokenCount = getTokenCount(message.text);
            panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
            break;
        case 'countChars':
            const charCount = message.text.length;
            panel.webview.postMessage({ command: 'setCharCount', count: charCount });
            break;
        case 'requestCounts':
            panel.webview.postMessage({ command: 'setTokenCount', count: getTokenCount(message.text) });
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
            break;
        case 'updateFileTypes':
            const currentFileTypes = await ConfigManager.getInstance().getFileTypes();
            const fileTypeIndex = currentFileTypes.indexOf(message.fileType);
            if (fileTypeIndex > -1) {
                currentFileTypes.splice(fileTypeIndex, 1);
            } else {
                currentFileTypes.push(message.fileType);
            }
            await ConfigManager.getInstance().setFileTypes(currentFileTypes);
            panel.webview.postMessage({
                command: 'configUpdated',
                fileTypes: currentFileTypes
            });
            break;
    }

    // Post back the updated configuration
    const updatedConfig = {
        compressionLevel: await ConfigManager.getInstance().getCompressionLevel(),
        fileTypes: await ConfigManager.getInstance().getFileTypes(),
        clipboardDataBoxHeight: await ConfigManager.getInstance().getClipboardDataBoxHeight()
    };
    console.log(`Posting back updated config`);
    panel.webview.postMessage({
        command: 'configUpdated',
        ...updatedConfig
    });
}

// Periodically polls the clipboard and sends updates to the webview
async function clipBoardPolling(panel: vscode.WebviewPanel) {
    let lastKnownClipboardContent = ''; // Keep track of the last known content

    setInterval(async () => {
        const clipboardContent = await vscode.env.clipboard.readText();
        if (clipboardContent !== lastKnownClipboardContent) {
            lastKnownClipboardContent = clipboardContent; // Update last known content
            panel.webview.postMessage({
                command: 'updateClipboardDataBox',
                content: clipboardContent
            });
        }
    }, 800);

    const clipboardContent = await vscode.env.clipboard.readText();

    if (clipboardContent !== lastKnownClipboardContent) {
        lastKnownClipboardContent = clipboardContent; // Update last known content
        const tokenCount = getTokenCount(clipboardContent);
        const charCount = clipboardContent.length;
        panel.webview.postMessage({
            command: 'updateClipboardDataBox',
            content: clipboardContent,
            tokenCount: tokenCount,
            charCount: charCount
        });
    }
}

// Prepares and returns the HTML content to be displayed in the webview, including injecting the correct CSS file reference.
async function composeWebViewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    try {
        const htmlPath = vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.html');
        const htmlContentUint8 = await vscode.workspace.fs.readFile(htmlPath);
        let htmlContent = Buffer.from(htmlContentUint8).toString('utf8');

        // Correctly reference CSS and JS with webview-compatible URIs
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.js'));

        // Replace placeholders or specific script and link tags with correct URIs
        htmlContent = htmlContent.replace(/<link rel="stylesheet" href=".\/webview.css">/, `<link rel="stylesheet" href="${styleUri}">`);
        htmlContent = htmlContent.replace(/<script src="webview.js"><\/script>/, `<script src="${scriptUri}"></script>`);

        return htmlContent;
        
    } catch (error) {
        console.error(`Failed to load webview content: ${error}`);
        return 'Error loading webview content.';
    }
}

function setupWebviewPanelActions(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    // Send initial configuration to webview
    const sendConfigToWebview = () => {
        panel.webview.postMessage({
            command: 'initConfig',
            fileTypes: ConfigManager.getInstance().getFileTypes(),
            compressionLevel: ConfigManager.getInstance().getCompressionLevel(),
            clipboardDataBoxHeight: ConfigManager.getInstance().getClipboardDataBoxHeight()
        });
    };

    // Ensures that when the webview gains focus, it receives the latest configuration and state
    panel.onDidChangeViewState(({ webviewPanel }) => {
        if (webviewPanel.visible) {
            sendConfigToWebview();
            clipBoardPolling(panel); // Continue clipboard polling if needed
        }
    });
    // Initial send of configuration to ensure webview is up-to-date
    sendConfigToWebview();
}