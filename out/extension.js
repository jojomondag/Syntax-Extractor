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
// Defines a data provider for a tree view, implementing the necessary interfaces for VS Code to render and manage tree items.
class MyDataProvider {
    getTreeItem(element) { return element; }
    getChildren(element) { return Promise.resolve([]); }
}
// Activates the extension, setting up the tree view and command registration.
function activate(context) {
    const treeDataProvider = new MyDataProvider();
    const treeView = vscode.window.createTreeView('emptyView', {
        treeDataProvider: treeDataProvider
    });
    let openWebviewDisposable = vscode.commands.registerCommand('extension.createWebview', () => { openWebviewAndExplorerSidebar(context); });
    context.subscriptions.push(openWebviewDisposable);
    let extractFileFolderTreeDisposable = vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', operations_1.extractFileFolderTree);
    context.subscriptions.push(extractFileFolderTreeDisposable);
    let extractAndCopyTextDisposable = vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', operations_1.extractAndCopyText);
    context.subscriptions.push(extractAndCopyTextDisposable);
    treeView.onDidChangeVisibility(({ visible }) => {
        if (visible) {
            openWebviewAndExplorerSidebar(context);
        }
    });
}
exports.activate = activate;
// Opens a webview for displaying web content and then switches to the Explorer sidebar.
function openWebviewAndExplorerSidebar(context) {
    const panel = vscode.window.createWebviewPanel('webPageView', // Identifies the type of the webview. Used internally
    'SynExt', // Title of the panel displayed to the user
    vscode.ViewColumn.One, // Editor column to show the new webview panel in.
    {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
    });
    // Load and display HTML content in the webview
    (async () => {
        panel.webview.html = await composeWebViewContent(panel.webview, context.extensionUri);
    })();
    clipBoardPolling(panel);
    // Listen for messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'setCompressionLevel':
                await ConfigManager_1.ConfigManager.getInstance().setCompressionLevel(message.level);
                // After updating, send back the new config to update the webview UI
                panel.webview.postMessage({
                    command: 'configUpdated',
                    compressionLevel: ConfigManager_1.ConfigManager.getInstance().getCompressionLevel(),
                    fileTypes: ConfigManager_1.ConfigManager.getInstance().getFileTypes() // Optional, if you want to include file types in the update
                });
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
                if (panel) {
                    panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
                }
                break;
            case 'countChars':
                const charCount = message.text.length;
                if (panel) {
                    panel.webview.postMessage({ command: 'setCharCount', count: charCount });
                }
                break;
            case 'requestCounts':
                // Send the counts back to the webview
                panel.webview.postMessage({ command: 'setTokenCount', count: (0, operations_1.getTokenCount)(message.text) });
                panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
                break;
            case 'updateFileTypes':
                const currentFileTypes = ConfigManager_1.ConfigManager.getInstance().getFileTypes();
                const fileTypeIndex = currentFileTypes.indexOf(message.fileType);
                if (fileTypeIndex > -1) {
                    // Remove the fileType if it already exists
                    currentFileTypes.splice(fileTypeIndex, 1);
                }
                else {
                    // Add the new fileType
                    currentFileTypes.push(message.fileType);
                }
                await ConfigManager_1.ConfigManager.getInstance().setFileTypes(currentFileTypes);
                // After updating, send back the new config to update the webview UI
                panel.webview.postMessage({
                    command: 'configUpdated',
                    fileTypes: currentFileTypes
                });
                break;
        }
        // After processing the message, you can send back updated config or an acknowledgment
        // This example sends back the updated configuration
        const updatedLevel = ConfigManager_1.ConfigManager.getInstance().getCompressionLevel();
        console.log(`Posting back compression level: ${updatedLevel}`);
        panel.webview.postMessage({
            command: 'configUpdated',
            compressionLevel: updatedLevel,
            fileTypes: ConfigManager_1.ConfigManager.getInstance().getFileTypes()
        });
    }, undefined, context.subscriptions);
    // Optionally send initial configuration to webview
    panel.webview.postMessage({
        command: 'initConfig',
        fileTypes: ConfigManager_1.ConfigManager.getInstance().getFileTypes(),
        compressionLevel: ConfigManager_1.ConfigManager.getInstance().getCompressionLevel(),
        clipboardDataBoxHeight: ConfigManager_1.ConfigManager.getInstance().getClipboardDataBoxHeight()
    });
    // Adjust view as necessary
    vscode.commands.executeCommand('workbench.action.closeSidebar');
    // Activates the Explorer sidebar
    vscode.commands.executeCommand('workbench.view.explorer');
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
//# sourceMappingURL=extension.js.map