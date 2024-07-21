import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { openWebviewAndExplorerSidebar, updateWebviewFileTypes, globalPanel } from './webviewUtils';
import { extractAndCopyText, extractFileFolderTree } from '../operations';
import { handleFileTypeChange, refreshFileTypes } from './commonUtils';
import { MyDataProvider } from './myDataProvider';

export const registerCommands = (context: vscode.ExtensionContext, configManager: ConfigManager) => {
    const commands = [
        { command: 'extension.createWebview', callback: () => openWebviewAndExplorerSidebar(context) },
        { command: 'syntaxExtractor.extractFileFolderTree', callback: (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => 
            extractFileFolderTree(configManager, contextSelection, allSelections || [contextSelection]) },
        { command: 'syntaxExtractor.extractAndCopyText', callback: (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => 
            extractAndCopyText(contextSelection, allSelections || [contextSelection]) },
        { command: 'extension.refreshFileTypes', callback: async () => {
            await refreshFileTypes();
            if (globalPanel) await updateWebviewFileTypes(globalPanel);
        }},
        { command: 'syntaxExtractor.addFileTypesOrFolders', callback: (contextSelection: vscode.Uri) => 
            handleFileTypeChange(configManager, path.extname(contextSelection.fsPath), ConfigKey.FileTypes) },
        { command: 'syntaxExtractor.removeFromFileTypes', callback: (contextSelection: vscode.Uri) => 
            handleFileTypeChange(configManager, path.extname(contextSelection.fsPath), ConfigKey.FileTypesToIgnore) }
    ];

    commands.forEach(({ command, callback }) => {
        context.subscriptions.push(vscode.commands.registerCommand(command, callback));
    });
};

export const registerTreeView = (context: vscode.ExtensionContext) => {
    const treeView = vscode.window.createTreeView('emptyView', { treeDataProvider: new MyDataProvider() });
    context.subscriptions.push(
        treeView.onDidChangeVisibility(({ visible }) => {
            if (visible) openWebviewAndExplorerSidebar(context);
        })
    );
};