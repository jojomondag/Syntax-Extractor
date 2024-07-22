import * as vscode from 'vscode';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { handleOpenWebpage } from '../commands/openWebpage';
import { getTokenCount } from '../operations/tokenUtils';

export let globalPanel: vscode.WebviewPanel | undefined;

export const openWebviewAndExplorerSidebar = async (context: vscode.ExtensionContext) => {
    const configManager = ConfigManager.getInstance();
    await configManager.syncAllSettings();

    if (globalPanel?.webview.html === '') {
        globalPanel = undefined;
    }

    if (!globalPanel) {
        globalPanel = vscode.window.createWebviewPanel(
            'webPageView', 'SynExt', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
            }
        );

        globalPanel.webview.html = await composeWebViewContent(globalPanel.webview, context.extensionUri);
        setupWebviewPanelActions(globalPanel, context);
        await clipBoardPolling(globalPanel);

        globalPanel.webview.onDidReceiveMessage(
            message => handleReceivedMessage(message, globalPanel!, context),
            undefined,
            context.subscriptions
        );

        globalPanel.onDidDispose(() => {
            globalPanel = undefined;
        });

        await updateWebviewFileTypes(globalPanel);
    }

    globalPanel.reveal(vscode.ViewColumn.One);
    await vscode.commands.executeCommand('workbench.view.explorer');
};

export const updateWebviewFileTypes = async (panel: vscode.WebviewPanel) => {
    const configManager = ConfigManager.getInstance();
    const config = {
        fileTypes: configManager.getValue(ConfigKey.FileTypesAndFoldersToCheck),
        fileTypesToIgnore: configManager.getValue(ConfigKey.FileTypesAndFoldersToIgnore),
        hideFoldersAndFiles: configManager.getValue(ConfigKey.FileTypesAndFoldersToHide)
    };
    panel.webview.postMessage({ command: 'updateFileTypes', ...config });
};

const composeWebViewContent = async (webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> => {
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
};

const setupWebviewPanelActions = (panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => {
    const sendConfigToWebview = () => {
        const configManager = ConfigManager.getInstance();
        panel.webview.postMessage({ command: 'initConfig', ...configManager.getAllConfig() });
    };

    panel.onDidChangeViewState(({ webviewPanel }) => {
        if (webviewPanel.visible) {
            sendConfigToWebview();
            clipBoardPolling(panel);
        }
    });
    sendConfigToWebview();
};

const clipBoardPolling = async (panel: vscode.WebviewPanel) => {
    let lastKnownClipboardContent = '';

    const pollClipboard = async () => {
        const clipboardContent = await vscode.env.clipboard.readText();
        if (clipboardContent !== lastKnownClipboardContent) {
            lastKnownClipboardContent = clipboardContent;
            panel.webview.postMessage({ command: 'updateClipboardDataBox', content: clipboardContent });
        }
    };

    await pollClipboard();
    setInterval(pollClipboard, 500);
};

const handleReceivedMessage = (message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => {
    switch (message.command) {
        case 'setCompressionLevel':
            ConfigManager.getInstance().setValue(ConfigKey.CompressionLevel, message.level);
            break;
        case 'setClipboardDataBoxHeight':
            ConfigManager.getInstance().setValue(ConfigKey.ClipboardDataBoxHeight, message.height);
            break;
        case 'countTokens':
            panel.webview.postMessage({ command: 'setTokenCount', count: getTokenCount(message.text) });
            break;
        case 'countChars':
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
            break;
        case 'openWebpage':
            handleOpenWebpage();
            break;
        case 'updateFileTypes':
            updateFileTypes(message.activeFileTypes, message.ignoredFileTypes, message.hiddenStates);
            break;
        case 'addToIgnoreList':
        case 'removeFromIgnoreList':
        case 'addToHideFoldersAndFiles':
        case 'removeFromHideFoldersAndFiles':
            handleFileTypeChange(message);
            break;
    }
};

const updateFileTypes = (activeFileTypes: string[], ignoredFileTypes: string[], hiddenStates: Record<string, boolean>) => {
    const configManager = ConfigManager.getInstance();
    configManager.setValue(ConfigKey.FileTypesAndFoldersToCheck, activeFileTypes);
    configManager.setValue(ConfigKey.FileTypesAndFoldersToIgnore, ignoredFileTypes);
    
    const hiddenItems = Object.entries(hiddenStates)
        .filter(([_, isHidden]) => isHidden)
        .map(([item]) => item);
    configManager.setValue(ConfigKey.FileTypesAndFoldersToHide, hiddenItems);
};

const handleFileTypeChange = (message: any) => {
    const configManager = ConfigManager.getInstance();
    const { command, item } = message;
    
    switch (command) {
        case 'addToIgnoreList':
            configManager.moveFileTypeToIgnore(item);
            break;
        case 'removeFromIgnoreList':
            configManager.moveFileType(item, ConfigKey.FileTypesAndFoldersToIgnore, ConfigKey.FileTypesAndFoldersToCheck);
            break;
        case 'addToHideFoldersAndFiles':
            configManager.moveFileTypeToHideFoldersAndFiles(item);
            break;
        case 'removeFromHideFoldersAndFiles':
            configManager.moveFileType(item, ConfigKey.FileTypesAndFoldersToHide, ConfigKey.FileTypesAndFoldersToCheck);
            break;
    }
};