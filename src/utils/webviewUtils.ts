import * as vscode from 'vscode';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { getTokenCount } from '../operations/tokenUtils';
import { handleOpenWebpage } from '../commands/openWebpage';
import { updateWebviewFileTypes } from './commonUtils';
import { refreshFileTypes, updateConfig } from './commonUtils';

export let globalPanel: vscode.WebviewPanel | undefined;
export { updateWebviewFileTypes };

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

        // Sync webview with the current settings
        await updateWebviewFileTypes(globalPanel);
    }

    globalPanel.reveal(vscode.ViewColumn.One);
    await vscode.commands.executeCommand('workbench.view.explorer');
};

const handleReceivedMessage = async (message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => {
    const configManager = ConfigManager.getInstance();
    const handlers: Record<string, () => Promise<void>> = {
        refreshFileTypes: async () => {
            await refreshFileTypes();
            await updateWebviewFileTypes(panel);
            panel.webview.postMessage({ command: 'refreshComplete' });
        },
        setCompressionLevel: async () => await updateConfig(ConfigKey.CompressionLevel, message.level),
        updateFileTypes: async () => {
            if (Array.isArray(message.activeFileTypes) && Array.isArray(message.ignoredFileTypes)) {
                await Promise.all([
                    updateConfig(ConfigKey.FileTypesAndFoldersToCheck, message.activeFileTypes),
                    updateConfig(ConfigKey.FileTypesAndFoldersToIgnore, message.ignoredFileTypes)
                ]);
                await updateWebviewFileTypes(panel);
            } else {
                console.error('Invalid file types received');
            }
        },
        setClipboardDataBoxHeight: async () => await updateConfig(ConfigKey.ClipboardDataBoxHeight, message.height),
        openWebpage: async () => await handleOpenWebpage(),
        countTokens: async () => {
            panel.webview.postMessage({ command: 'setTokenCount', count: getTokenCount(message.text) });
        },
        countChars: async () => {
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
        },
        requestCounts: async () => {
            panel.webview.postMessage({ command: 'setTokenCount', count: getTokenCount(message.text) });
            panel.webview.postMessage({ command: 'setCharCount', count: message.text.length });
        },
        getFileTypes: async () => await updateWebviewFileTypes(panel),
        moveFileTypeToIgnore: async () => {
            await configManager.moveFileTypeToIgnore(message.fileType);
            await updateWebviewFileTypes(panel);
        },
        moveFileTypeToHide: async () => {
            await configManager.moveFileTypeToHideFoldersAndFiles(message.fileType);
            await updateWebviewFileTypes(panel);
        },
        addToHideFoldersAndFiles: async () => await addToHideFoldersAndFiles(configManager, message.item),
        removeFromHideFoldersAndFiles: async () => await removeFromHideFoldersAndFiles(configManager, message.item),
        getHideFoldersAndFiles: async () => await sendHideFoldersAndFiles(panel),
        updateHiddenStates: async () => {
            if (typeof message.hiddenStates === 'object') {
                const hiddenItems = Object.keys(message.hiddenStates).filter(key => message.hiddenStates[key]);
                await updateConfig(ConfigKey.FileTypesAndFoldersToHide, hiddenItems);
                await configManager.syncAllSettings();
            }
        },
        setItemHiddenState: async () => {
            if (typeof message.item === 'string' && typeof message.isHidden === 'boolean') {
                await setItemHiddenState(configManager, message.item, message.isHidden);
            }
        }
    };

    await (handlers[message.command] || (async () => {}))();
    panel.webview.postMessage({ command: 'configUpdated', ...configManager.getAllConfig() });
};

const addToHideFoldersAndFiles = async (configManager: ConfigManager, item: string) => {
    const hiddenItems = configManager.getValue(ConfigKey.FileTypesAndFoldersToHide) as string[];
    if (!hiddenItems.includes(item)) {
        await updateConfig(ConfigKey.FileTypesAndFoldersToHide, [...hiddenItems, item]);
    }
};

const removeFromHideFoldersAndFiles = async (configManager: ConfigManager, item: string) => {
    const hiddenItems = configManager.getValue(ConfigKey.FileTypesAndFoldersToHide) as string[];
    await updateConfig(ConfigKey.FileTypesAndFoldersToHide, hiddenItems.filter(i => i !== item));
};

const sendHideFoldersAndFiles = async (panel: vscode.WebviewPanel) => {
    const configManager = ConfigManager.getInstance();
    const hideFoldersAndFiles = configManager.getValue(ConfigKey.FileTypesAndFoldersToHide);
    panel.webview.postMessage({ command: 'updateHideFoldersAndFiles', hideFoldersAndFiles });
};

const setItemHiddenState = async (configManager: ConfigManager, item: string, isHidden: boolean) => {
    const hiddenItems = configManager.getValue(ConfigKey.FileTypesAndFoldersToHide) as string[];
    const updatedHiddenItems = isHidden
        ? [...new Set([...hiddenItems, item])]
        : hiddenItems.filter(i => i !== item);
    await updateConfig(ConfigKey.FileTypesAndFoldersToHide, updatedHiddenItems);
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
