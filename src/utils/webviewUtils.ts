import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { getTokenCount } from '../operations';
import { handleOpenWebpage } from '../commands/openWebpage';
import { detectWorkspaceFileTypes, initializeFileTypeConfiguration } from '../operations/initializeFileTypes';

export let globalPanel: vscode.WebviewPanel | undefined;

export async function openWebviewAndExplorerSidebar(context: vscode.ExtensionContext) {
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

        globalPanel.webview.onDidReceiveMessage(async message => {
            if (globalPanel) await handleReceivedMessage(message, globalPanel, context);
        }, undefined, context.subscriptions);

        await updateWebviewFileTypes(globalPanel);
    }

    await vscode.commands.executeCommand('workbench.view.explorer');
}

export async function refreshFileTypes(): Promise<string[]> {
    const configManager = ConfigManager.getInstance();
    const detectedTypes = await detectWorkspaceFileTypes();
    const fileTypes = detectedTypes.filter((type: unknown): type is string => typeof type === 'string');
    await configManager.setValue(ConfigKey.FileTypes, fileTypes);
    await configManager.setValue(ConfigKey.FileTypesToIgnore, []);
    return fileTypes;
}

export async function updateWebviewFileTypes(panel: vscode.WebviewPanel) {
    const configManager = ConfigManager.getInstance();
    const fileTypes = configManager.getValue(ConfigKey.FileTypes);
    const fileTypesToIgnore = configManager.getValue(ConfigKey.FileTypesToIgnore);
    panel.webview.postMessage({ command: 'updateFileTypes', fileTypes, fileTypesToIgnore });
}

export async function handleReceivedMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();
    switch (message.command) {
        case 'refreshFileTypes':
            await refreshFileTypes();
            await updateWebviewFileTypes(panel);
            panel.webview.postMessage({ command: 'refreshComplete' });
            break;
        case 'setCompressionLevel':
            await configManager.setValue(ConfigKey.CompressionLevel, message.level);
            break;
        case 'updateFileTypes':
            if (Array.isArray(message.activeFileTypes) && Array.isArray(message.ignoredFileTypes)) {
                await updateFileTypeSettings(configManager, message.activeFileTypes, message.ignoredFileTypes);
                await updateWebviewFileTypes(panel);
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
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
            break;
        case 'requestCounts':
            panel.webview.postMessage({ command: 'setTokenCount', count: getTokenCount(message.text) });
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
            break;
        case 'getFileTypes':
            await updateWebviewFileTypes(panel);
            break;
    }

    panel.webview.postMessage({ command: 'configUpdated', ...configManager.getAllConfig() });
}

function setupWebviewPanelActions(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
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
}

export async function composeWebViewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
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

export async function clipBoardPolling(panel: vscode.WebviewPanel) {
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
}

async function updateFileTypeSettings(configManager: ConfigManager, activeFileTypes: string[], ignoredFileTypes: string[]) {
    const currentFileTypes = configManager.getValue(ConfigKey.FileTypes) as string[];
    const currentIgnoredFileTypes = configManager.getValue(ConfigKey.FileTypesToIgnore) as string[];

    const allNewFileTypes = new Set([...activeFileTypes, ...ignoredFileTypes]);
    const removedFileTypes = [...currentFileTypes, ...currentIgnoredFileTypes].filter(type => !allNewFileTypes.has(type));

    await configManager.setValue(ConfigKey.FileTypes, activeFileTypes);
    await configManager.setValue(ConfigKey.FileTypesToIgnore, ignoredFileTypes);

    if (removedFileTypes.length > 0) {
        console.log('Removed file types:', removedFileTypes);
        vscode.window.showInformationMessage(`Removed file types: ${removedFileTypes.join(', ')}`);
    }
}

export async function addFileTypesOrFolders(configManager: ConfigManager, contextSelection: vscode.Uri) {
    const stats = await vscode.workspace.fs.stat(contextSelection);
    let newFileTypesOrFolders: string[] = [];

    if (stats.type === vscode.FileType.Directory) {
        newFileTypesOrFolders.push(path.basename(contextSelection.fsPath));
    } else {
        const extension = path.extname(contextSelection.fsPath);
        if (extension) newFileTypesOrFolders.push(extension);
    }

    const currentFileTypes = configManager.getValue(ConfigKey.FileTypes) as string[];
    const updatedFileTypes = new Set(currentFileTypes);
    const itemsAdded: string[] = [];
    const itemsSkipped: string[] = [];

    for (const item of newFileTypesOrFolders) {
        if (!configManager.isFileTypeOrFolderPresent(item)) {
            updatedFileTypes.add(item);
            itemsAdded.push(item);
        } else {
            itemsSkipped.push(item);
        }
    }

    if (itemsAdded.length > 0) {
        await configManager.setValue(ConfigKey.FileTypes, Array.from(updatedFileTypes));
        vscode.window.showInformationMessage(`Added ${itemsAdded.join(', ')} to File Types`);
    }

    if (itemsSkipped.length > 0) {
        vscode.window.showWarningMessage(`Skipped ${itemsSkipped.join(', ')} as they already exist in File Types or Ignored Types`);
    }

    updateWebviewFileTypes(globalPanel!);
}

export async function removeFromFileTypes(configManager: ConfigManager, contextSelection: vscode.Uri) {
    const stats = await vscode.workspace.fs.stat(contextSelection);
    let fileTypesToRemove: string[] = [];

    if (stats.type === vscode.FileType.Directory) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(contextSelection, '**/*'));
        fileTypesToRemove = Array.from(new Set(files.map(file => path.extname(file.fsPath))));
    } else {
        fileTypesToRemove = [path.extname(contextSelection.fsPath)];
    }

    const currentFileTypes = configManager.getValue(ConfigKey.FileTypes) as string[];
    const updatedFileTypes = currentFileTypes.filter(type => !fileTypesToRemove.includes(type));

    await configManager.setValue(ConfigKey.FileTypes, updatedFileTypes);
    vscode.window.showInformationMessage(`Removed ${fileTypesToRemove.join(', ')} from File Types`);

    updateWebviewFileTypes(globalPanel!);
}
