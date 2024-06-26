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
    context.subscriptions.push(vscode.commands.registerCommand('extension.createWebview', async () => {
        await openWebviewAndExplorerSidebar(context);
    }), vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', (contextSelection, allSelections) => {
        if (!allSelections) {
            allSelections = contextSelection ? [contextSelection] : [];
        }
        (0, operations_1.extractFileFolderTree)(configManager, contextSelection, allSelections);
    }), vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', (contextSelection, allSelections) => {
        if (!allSelections) {
            allSelections = contextSelection ? [contextSelection] : [];
        }
        (0, operations_1.extractAndCopyText)(contextSelection, allSelections);
    }), vscode.commands.registerCommand('extension.refreshFileTypes', refreshFileTypes));
    treeView.onDidChangeVisibility(({ visible }) => {
        if (visible) {
            openWebviewAndExplorerSidebar(context);
        }
    });
}
exports.activate = activate;
async function openWebviewAndExplorerSidebar(context) {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    // Check and initialize file types before opening the webview
    await (0, initializeFileTypes_1.initializeFileTypeConfiguration)();
    if (globalPanel) {
        globalPanel.reveal(vscode.ViewColumn.One);
    }
    else {
        globalPanel = vscode.window.createWebviewPanel('webPageView', 'SynExt', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
        });
        globalPanel.onDidDispose(() => {
            console.log('Webview was closed');
            globalPanel = undefined;
        }, null, context.subscriptions);
        globalPanel.webview.html = await composeWebViewContent(globalPanel.webview, context.extensionUri);
        setupWebviewPanelActions(globalPanel, context);
        await clipBoardPolling(globalPanel);
        globalPanel.webview.onDidReceiveMessage(async (message) => {
            if (globalPanel) {
                await handleReceivedMessage(message, globalPanel, context);
            }
        }, undefined, context.subscriptions);
        await updateWebviewFileTypes(globalPanel);
    }
    await vscode.commands.executeCommand('workbench.view.explorer');
}
async function checkAndRefreshFileTypes() {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    const fileTypes = configManager.getValue(ConfigManager_1.ConfigKey.FileTypes);
    const fileTypesToIgnore = configManager.getValue(ConfigManager_1.ConfigKey.FileTypesToIgnore);
    if (!Array.isArray(fileTypes) || fileTypes.length === 0 ||
        !Array.isArray(fileTypesToIgnore) || fileTypesToIgnore.length === 0) {
        console.log('File types or ignored types are missing or empty. Automatically refreshing file types.');
        await refreshFileTypes();
    }
    else {
        console.log('File types exist:', fileTypes);
        console.log('Ignored file types:', fileTypesToIgnore);
    }
}
async function refreshFileTypes() {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    console.log("Refreshing file types...");
    const detectedTypes = await (0, initializeFileTypes_1.detectWorkspaceFileTypes)();
    const fileTypes = detectedTypes.filter((type) => typeof type === 'string');
    await configManager.setValue(ConfigManager_1.ConfigKey.FileTypes, fileTypes);
    return fileTypes;
}
async function updateWebviewFileTypes(panel) {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    panel.webview.postMessage({
        command: 'updateFileTypes',
        fileTypes: configManager.getValue(ConfigManager_1.ConfigKey.FileTypes),
        fileTypesToIgnore: configManager.getValue(ConfigManager_1.ConfigKey.FileTypesToIgnore)
    });
}
async function handleReceivedMessage(message, panel, context) {
    const configManager = ConfigManager_1.ConfigManager.getInstance();
    switch (message.command) {
        case 'refreshFileTypes':
            await checkAndRefreshFileTypes();
            await updateWebviewFileTypes(panel);
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
async function clipBoardPolling(panel) {
    let lastKnownClipboardContent = '';
    const pollClipboard = async () => {
        const clipboardContent = await vscode.env.clipboard.readText();
        if (clipboardContent !== lastKnownClipboardContent) {
            lastKnownClipboardContent = clipboardContent;
            panel.webview.postMessage({
                command: 'updateClipboardDataBox',
                content: clipboardContent
            });
        }
    };
    await pollClipboard();
    setInterval(pollClipboard, 500);
}
async function composeWebViewContent(webview, extensionUri) {
    try {
        const htmlPath = vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.html');
        const htmlContentUint8 = await vscode.workspace.fs.readFile(htmlPath);
        let htmlContent = Buffer.from(htmlContentUint8).toString('utf8');
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.js'));
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
    const sendConfigToWebview = () => {
        panel.webview.postMessage({
            command: 'initConfig',
            ...configManager.getAllConfig()
        });
    };
    panel.onDidChangeViewState(({ webviewPanel }) => {
        if (webviewPanel.visible) {
            sendConfigToWebview();
            clipBoardPolling(panel);
        }
    });
    sendConfigToWebview();
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map