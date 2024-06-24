import * as vscode from 'vscode';
import { initializeFileTypeConfiguration, detectWorkspaceFileTypes } from './operations/initializeFileTypes';
import { ConfigManager, ConfigKey } from './config/ConfigManager';
import { extractAndCopyText, extractFileFolderTree, getTokenCount } from './operations';
import { handleOpenWebpage } from './commands/openWebpage';

// Defines a data provider for a tree view, implementing the necessary interfaces for VS Code to render and manage tree items.
class MyDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }
    getChildren(): Thenable<vscode.TreeItem[]> { return Promise.resolve([]); }
}

let globalPanel: vscode.WebviewPanel | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: new MyDataProvider() });

    // Check if settings.json exists
    const settingsExist = await settingsFileExists();
    if (!settingsExist) {
        // If settings.json doesn't exist, create it with default settings
        await createDefaultSettings();
    }

    await loadFileTypes(configManager);

    // Start the webview
    await openWebviewAndExplorerSidebar(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.createWebview', async () => {
            await openWebviewAndExplorerSidebar(context);
        }),
        vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
            if (!allSelections) {
                allSelections = contextSelection ? [contextSelection] : [];
            }
            extractFileFolderTree(configManager, contextSelection, allSelections);
        }),
        vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
            if (!allSelections) {
                allSelections = contextSelection ? [contextSelection] : [];
            }
            extractAndCopyText(contextSelection, allSelections);
        }),
        vscode.commands.registerCommand('extension.refreshFileTypes', refreshFileTypes)
    );
    
    treeView.onDidChangeVisibility(({ visible }: { visible: boolean }) => {
        if (visible) {
            openWebviewAndExplorerSidebar(context);
        }
    });
}

async function loadFileTypes(configManager: ConfigManager) {
    const fileTypes = configManager.getValue(ConfigKey.FileTypes);
    if (!Array.isArray(fileTypes) || fileTypes.length === 0) {
        console.log('No file types found. Initializing file types.');
        await initializeFileTypeConfiguration();
    } else {
        console.log('File types already exist:', fileTypes);
    }
}

// Function to check if settings.json exists
async function settingsFileExists(): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace is opened.');
        return false;
    }

    const settingsUri = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode', 'settings.json');
    
    try {
        await vscode.workspace.fs.stat(settingsUri);
        return true;
    } catch (error) {
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
    } catch (error) {
        console.error('Failed to create default settings.json:', error);
    }
}

async function openWebviewAndExplorerSidebar(context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();

    if (globalPanel) {
        // Reveal the existing webview panel
        globalPanel.reveal(vscode.ViewColumn.One);
    } else {
        // Create a new webview if it does not already exist
        globalPanel = vscode.window.createWebviewPanel(
            'webPageView', 'SynExt', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
            }
        );

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
        globalPanel.webview.onDidReceiveMessage(
            message => {
                if (globalPanel) { // Additional check for safety
                    handleReceivedMessage(message, globalPanel, context);
                }
            },
            undefined,
            context.subscriptions
        );

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
    const configManager = ConfigManager.getInstance();
    console.log("Reinitializing file types...");
    const detectedTypes = await detectWorkspaceFileTypes();
    const fileTypes = detectedTypes.filter((type: unknown): type is string => typeof type === 'string');
    await configManager.setValue(ConfigKey.FileTypes, fileTypes);
    console.log("File types reinitialized:", fileTypes);
    return fileTypes;
}

async function handleReceivedMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();

    switch (message.command) {
        case 'refreshFileTypes':
            await refreshFileTypes();
            panel.webview.postMessage({ command: 'refreshComplete' });
            break;
        case 'setCompressionLevel':
            await configManager.setValue(ConfigKey.CompressionLevel, message.level);
            break;
        case 'updateFileTypes':
            if (Array.isArray(message.activeFileTypes) && Array.isArray(message.ignoredFileTypes)) {
                await configManager.setValue(ConfigKey.FileTypes, message.activeFileTypes);
                await configManager.setValue(ConfigKey.FileTypesToIgnore, message.ignoredFileTypes);
            } else {
                console.error('Invalid file types received');
            }
            break;
        case 'setClipboardDataBoxHeight':
            await configManager.setValue(ConfigKey.ClipboardDataBoxHeight, message.height);
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
    }

    // Post back the updated configuration
    panel.webview.postMessage({
        command: 'configUpdated',
        ...configManager.getAllConfig()
    });
}

// Periodically polls the clipboard and sends updates to the webview
async function clipBoardPolling(panel: vscode.WebviewPanel) {
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
    const configManager = ConfigManager.getInstance();

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

export function deactivate() {}