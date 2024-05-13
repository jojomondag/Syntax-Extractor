"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const operations_1 = require("./operations");
const ConfigManager_1 = require("./config/ConfigManager");
const openWebpage_1 = require("./commands/openWebpage");
// Defin    es a data provider for a tree view, implementing the necessary interfaces for VS Code to render and manage tree items.
class MyDataProvider {
    getTreeItem(element) { return element; }
    getChildren() { return Promise.resolve([]); }
}
// Activates the extension, setting up the tree view and command registration.
function activate(context) {
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: new MyDataProvider() });
    context.subscriptions.push(vscode.commands.registerCommand('extension.createWebview', () => openWebviewAndExplorerSidebar(context)));
    context.subscriptions.push(vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', operations_1.extractFileFolderTree));
    context.subscriptions.push(vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', operations_1.extractAndCopyText));
    treeView.onDidChangeVisibility(({ visible }) => {
        if (visible) {
            openWebviewAndExplorerSidebar(context);
        }
    });
}
exports.activate = activate;
let globalPanel;
function openWebviewAndExplorerSidebar(context) {
    if (globalPanel) {
        // Reveal the existing webview panel
        globalPanel.reveal(vscode.ViewColumn.One);
    }
    else {
        // Create a new webview if it does not already exist
        globalPanel = vscode.window.createWebviewPanel('webPageView', 'SynExt', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
        });
        // Event to handle the disposal of the webview
        globalPanel.onDidDispose(() => {
            console.log('Webview was closed');
            globalPanel = undefined; // Clear the reference to the disposed webview
        }, null, context.subscriptions);
        // Load the content into the webview
        (async () => {
            globalPanel.webview.html = await composeWebViewContent(globalPanel.webview, context.extensionUri);
        })();
        // Setup actions associated with the webview
        setupWebviewPanelActions(globalPanel, context);
        // Setup clipboard polling
        clipBoardPolling(globalPanel);
        // Listen to messages from the webview and handle them
        globalPanel.webview.onDidReceiveMessage(message => {
            if (globalPanel) { // Additional check for safety
                handleReceivedMessage(message, globalPanel, context);
            }
        }, undefined, context.subscriptions);
        // Send initial configuration to the webview
        globalPanel.webview.postMessage({
            command: 'initConfig',
            fileTypes: ConfigManager_1.ConfigManager.getInstance().getFileTypes(),
            compressionLevel: ConfigManager_1.ConfigManager.getInstance().getCompressionLevel(),
            clipboardDataBoxHeight: ConfigManager_1.ConfigManager.getInstance().getClipboardDataBoxHeight()
        });
    }
    // This command ensures that the Explorer view is always shown when the button is pressed
    vscode.commands.executeCommand('workbench.view.explorer');
}
// Modified handleReceivedMessage to correctly handle async operations
async function handleReceivedMessage(message, panel, context) {
    switch (message.command) {
        case 'setCompressionLevel':
            await ConfigManager_1.ConfigManager.getInstance().setCompressionLevel(message.level);
            break;
        case 'setFileTypes':
            await ConfigManager_1.ConfigManager.getInstance().setFileTypes(message.fileTypes);
            break;
        case 'setClipboardDataBoxHeight':
            await ConfigManager_1.ConfigManager.getInstance().setClipboardDataBoxHeight(message.height);
            break;
        case 'openWebpage':
            (0, openWebpage_1.handleOpenWebpage)();
            break;
        case 'countTokens':
            const tokenCount = (0, operations_1.getTokenCount)(message.text);
            panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
            break;
        case 'countChars':
            const charCount = message.text.length;
            panel.webview.postMessage({ command: 'setCharCount', count: charCount });
            break;
        case 'requestCounts':
            panel.webview.postMessage({ command: 'setTokenCount', count: (0, operations_1.getTokenCount)(message.text) });
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
            break;
        case 'updateFileTypes':
            const currentFileTypes = await ConfigManager_1.ConfigManager.getInstance().getFileTypes();
            const fileTypeIndex = currentFileTypes.indexOf(message.fileType);
            if (fileTypeIndex > -1) {
                currentFileTypes.splice(fileTypeIndex, 1);
            }
            else {
                currentFileTypes.push(message.fileType);
            }
            await ConfigManager_1.ConfigManager.getInstance().setFileTypes(currentFileTypes);
            panel.webview.postMessage({
                command: 'configUpdated',
                fileTypes: currentFileTypes
            });
            break;
    }
    // Post back the updated configuration
    const updatedConfig = {
        compressionLevel: await ConfigManager_1.ConfigManager.getInstance().getCompressionLevel(),
        fileTypes: await ConfigManager_1.ConfigManager.getInstance().getFileTypes(),
        clipboardDataBoxHeight: await ConfigManager_1.ConfigManager.getInstance().getClipboardDataBoxHeight()
    };
    console.log(`Posting back updated config`);
    panel.webview.postMessage({
        command: 'configUpdated',
        ...updatedConfig
    });
}
// Periodically polls the clipboard and sends updates to the webview
async function clipBoardPolling(panel) {
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
        const tokenCount = (0, operations_1.getTokenCount)(clipboardContent);
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
async function composeWebViewContent(webview, extensionUri) {
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
    }
    catch (error) {
        console.error(`Failed to load webview content: ${error}`);
        return 'Error loading webview content.';
    }
}
function setupWebviewPanelActions(panel, context) {
    // Send initial configuration to webview
    const sendConfigToWebview = () => {
        panel.webview.postMessage({
            command: 'initConfig',
            fileTypes: ConfigManager_1.ConfigManager.getInstance().getFileTypes(),
            compressionLevel: ConfigManager_1.ConfigManager.getInstance().getCompressionLevel(),
            clipboardDataBoxHeight: ConfigManager_1.ConfigManager.getInstance().getClipboardDataBoxHeight()
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
//# sourceMappingURL=extension.js.map