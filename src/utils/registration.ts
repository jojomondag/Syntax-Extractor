import * as vscode from 'vscode';
import { ConfigManager } from '../config/ConfigManager';
import { openWebviewAndExplorerSidebar, updateWebviewFileTypes, globalPanel, refreshFileTypes, addFileTypesOrFolders, removeFromFileTypes } from './webviewUtils'; // Update imports
import { extractAndCopyText, extractFileFolderTree } from '../operations';
import { handleOpenWebpage } from '../commands/openWebpage';

export function registerCommands(context: vscode.ExtensionContext, configManager: ConfigManager) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.createWebview', async () => {
            await openWebviewAndExplorerSidebar(context);
        }),
        vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', async (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
            if (!allSelections) allSelections = contextSelection ? [contextSelection] : [];
            await extractFileFolderTree(configManager, contextSelection, allSelections);
        }),
        vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', async (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
            if (!allSelections) allSelections = contextSelection ? [contextSelection] : [];
            await extractAndCopyText(contextSelection, allSelections);
        }),
        vscode.commands.registerCommand('extension.refreshFileTypes', async () => {
            await refreshFileTypes();
            if (globalPanel) await updateWebviewFileTypes(globalPanel);
        }),
        vscode.commands.registerCommand('syntaxExtractor.addFileTypesOrFolders', async (contextSelection: vscode.Uri) => {
            await addFileTypesOrFolders(configManager, contextSelection);
        }),
        vscode.commands.registerCommand('syntaxExtractor.removeFromFileTypes', async (contextSelection: vscode.Uri) => {
            await removeFromFileTypes(configManager, contextSelection);
        })
    );
}

export function registerTreeView(context: vscode.ExtensionContext) {
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: new MyDataProvider() });
    context.subscriptions.push(
        treeView.onDidChangeVisibility(({ visible }: { visible: boolean }) => {
            if (visible) openWebviewAndExplorerSidebar(context);
        })
    );
}

class MyDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }
    getChildren(): Thenable<vscode.TreeItem[]> { return Promise.resolve([]); }
}
