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

async function openWebviewAndExplorerSidebar(context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();

    // Check and initialize file types before opening the webview
    await initializeFileTypeConfiguration();

    if (globalPanel) {
        globalPanel.reveal(vscode.ViewColumn.One);
    } else {
        globalPanel = vscode.window.createWebviewPanel(
            'webPageView', 'SynExt', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
            }
        );

        globalPanel.onDidDispose(() => {
            console.log('Webview was closed');
            globalPanel = undefined;
        }, null, context.subscriptions);

        globalPanel.webview.html = await composeWebViewContent(globalPanel.webview, context.extensionUri);

        setupWebviewPanelActions(globalPanel, context);
        await clipBoardPolling(globalPanel);

        globalPanel.webview.onDidReceiveMessage(
            async message => {
                if (globalPanel) {
                    await handleReceivedMessage(message, globalPanel, context);
                }
            },
            undefined,
            context.subscriptions
        );

        await updateWebviewFileTypes(globalPanel);
    }

    await vscode.commands.executeCommand('workbench.view.explorer');
}

async function checkAndRefreshFileTypes(): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const fileTypes = configManager.getValue(ConfigKey.FileTypes);
    const fileTypesToIgnore = configManager.getValue(ConfigKey.FileTypesToIgnore);

    if (!Array.isArray(fileTypes) || fileTypes.length === 0 || 
        !Array.isArray(fileTypesToIgnore) || fileTypesToIgnore.length === 0) {
        console.log('File types or ignored types are missing or empty. Automatically refreshing file types.');
        await refreshFileTypes();
    } else {
        console.log('File types exist:', fileTypes);
        console.log('Ignored file types:', fileTypesToIgnore);
    }
}

async function refreshFileTypes(): Promise<string[]> {
    const configManager = ConfigManager.getInstance();
    console.log("Refreshing file types...");
    const detectedTypes = await detectWorkspaceFileTypes();
    const fileTypes = detectedTypes.filter((type: unknown): type is string => typeof type === 'string');
    
    await configManager.setValue(ConfigKey.FileTypes, fileTypes);

    return fileTypes;
}

async function updateWebviewFileTypes(panel: vscode.WebviewPanel) {
    const configManager = ConfigManager.getInstance();
    panel.webview.postMessage({
        command: 'updateFileTypes',
        fileTypes: configManager.getValue(ConfigKey.FileTypes),
        fileTypesToIgnore: configManager.getValue(ConfigKey.FileTypesToIgnore)
    });
}

async function handleReceivedMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();

    switch (message.command) {
        case 'refreshFileTypes':
            await checkAndRefreshFileTypes();
            await updateWebviewFileTypes(panel);
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

async function clipBoardPolling(panel: vscode.WebviewPanel) {
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

async function composeWebViewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    try {
        const htmlPath = vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.html');
        const htmlContentUint8 = await vscode.workspace.fs.readFile(htmlPath);
        let htmlContent = Buffer.from(htmlContentUint8).toString('utf8');

        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.js'));

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

export function deactivate() {}