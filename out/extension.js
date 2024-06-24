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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const initializeFileTypes_1 = require("./operations/initializeFileTypes");
const ConfigManager_1 = require("./config/ConfigManager");
const operations_1 = require("./operations");
const openWebpage_1 = require("./commands/openWebpage");
// Defines a data provider for a tree view, implementing the necessary interfaces for VS Code to render and manage tree items.
class MyDataProvider {
    getTreeItem(element) { return element; }
    getChildren() { return Promise.resolve([]); }
}
let globalPanel;
async function activate(context) {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: new MyDataProvider() });
    // Check if settings.json exists
    const settingsExist = await settingsFileExists();
    if (!settingsExist) {
        // If settings.json doesn't exist, create it with default settings
        await createDefaultSettings();
    }
    // Load file types
    await loadFileTypes(configManager);
    // Start the webview
    await openWebviewAndExplorerSidebar(context);
    context.subscriptions.push(vscode.commands.registerCommand('extension.createWebview', async () => {
        await openWebviewAndExplorerSidebar(context);
    }), vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', () => (0, operations_1.extractFileFolderTree)(configManager)), vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', operations_1.extractAndCopyText), vscode.commands.registerCommand('extension.refreshFileTypes', refreshFileTypes));
    treeView.onDidChangeVisibility(({ visible }) => {
        if (visible) {
            openWebviewAndExplorerSidebar(context);
        }
    });
}
exports.activate = activate;
async function loadFileTypes(configManager) {
    const fileTypes = configManager.getValue(ConfigManager_1.ConfigKey.FileTypes);
    if (!Array.isArray(fileTypes) || fileTypes.length === 0) {
        console.log('No file types found. Initializing file types.');
        await (0, initializeFileTypes_1.initializeFileTypeConfiguration)();
        // After initialization, retrieve the file types again
        const initializedFileTypes = configManager.getValue(ConfigManager_1.ConfigKey.FileTypes);
        console.log('Initialized file types:', initializedFileTypes);
    }
    else {
        console.log('File types already exist:', fileTypes);
    }
}
// Function to check if settings.json exists
async function settingsFileExists() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace is opened.');
        return false;
    }
    const settingsUri = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode', 'settings.json');
    try {
        await vscode.workspace.fs.stat(settingsUri);
        return true;
    }
    catch (error) {
        return false;
    }
}
// Function to create default settings
async function createDefaultSettings() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace is opened. Cannot create settings.json');
        return;
    }
    const settingsUri = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode', 'settings.json');
    const defaultSettings = {
        "syntaxExtractor.fileTypes": [],
        "syntaxExtractor.fileTypesToIgnore": [],
        "syntaxExtractor.compressionLevel": "medium"
    };
    try {
        await vscode.workspace.fs.writeFile(settingsUri, Buffer.from(JSON.stringify(defaultSettings, null, 2)));
        console.log('Created default settings.json');
    }
    catch (error) {
        console.error('Failed to create default settings.json:', error);
    }
}
async function openWebviewAndExplorerSidebar(context) {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
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
        globalPanel.webview.html = await composeWebViewContent(globalPanel.webview, context.extensionUri);
        // Setup actions associated with the webview
        setupWebviewPanelActions(globalPanel, context);
        // Setup clipboard polling
        await clipBoardPolling(globalPanel);
        // Listen to messages from the webview and handle them
        globalPanel.webview.onDidReceiveMessage(message => {
            if (globalPanel) { // Additional check for safety
                handleReceivedMessage(message, globalPanel, context);
            }
        }, undefined, context.subscriptions);
        // Send initial configuration to the webview
        globalPanel.webview.postMessage({
            command: 'initConfig',
            ...configManager.getAllConfig()
        });
    }
    // This command ensures that the Explorer view is always shown when the button is pressed
    await vscode.commands.executeCommand('workbench.view.explorer');
}
async function refreshFileTypes() {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    console.log("Reinitializing file types...");
    const detectedTypes = await (0, initializeFileTypes_1.detectWorkspaceFileTypes)();
    const fileTypes = detectedTypes.filter((type) => typeof type === 'string');
    await configManager.setValue(ConfigManager_1.ConfigKey.FileTypes, fileTypes);
    console.log("File types reinitialized:", fileTypes);
    return fileTypes;
}
async function handleReceivedMessage(message, panel, context) {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    switch (message.command) {
        case 'refreshFileTypes':
            await refreshFileTypes();
            panel.webview.postMessage({ command: 'refreshComplete' });
            break;
        case 'setCompressionLevel':
            await configManager.setValue(ConfigManager_1.ConfigKey.CompressionLevel, message.level);
            break;
        case 'updateFileTypes':
            if (Array.isArray(message.activeFileTypes) && Array.isArray(message.ignoredFileTypes)) {
                await configManager.setValue(ConfigManager_1.ConfigKey.FileTypes, message.activeFileTypes);
                await configManager.setValue(ConfigManager_1.ConfigKey.FileTypesToIgnore, message.ignoredFileTypes);
            }
            else {
                console.error('Invalid file types received');
            }
            break;
        case 'setClipboardDataBoxHeight':
            await configManager.setValue(ConfigManager_1.ConfigKey.ClipboardDataBoxHeight, message.height);
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
    }
    // Post back the updated configuration
    panel.webview.postMessage({
        command: 'configUpdated',
        ...configManager.getAllConfig()
    });
}
// Periodically polls the clipboard and sends updates to the webview
async function clipBoardPolling(panel) {
    let lastKnownClipboardContent = ''; // Keep track of the last known content
    const pollClipboard = async () => {
        const clipboardContent = await vscode.env.clipboard.readText();
        if (clipboardContent !== lastKnownClipboardContent) {
            lastKnownClipboardContent = clipboardContent; // Update last known content
            panel.webview.postMessage({
                command: 'updateClipboardDataBox',
                content: clipboardContent
            });
        }
    };
    // Initial poll
    await pollClipboard();
    // Set up interval for polling
    setInterval(pollClipboard, 800);
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
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    // Send initial configuration to webview
    const sendConfigToWebview = () => {
        panel.webview.postMessage({
            command: 'initConfig',
            ...configManager.getAllConfig()
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
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map