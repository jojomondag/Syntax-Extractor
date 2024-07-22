import * as path from 'path';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import * as vscode from 'vscode';

export const updateConfig = async (key: ConfigKey, value: any) => 
    await ConfigManager.getInstance().setValue(key, value);

export const addFileOrFolder = async (contextSelection: vscode.Uri) => {
    const configManager = ConfigManager.getInstance();
    const filePath = contextSelection.fsPath;
    const folderName = path.basename(filePath);

    const fileTypesToCheck = configManager.getValue<string[]>(ConfigKey.FileTypesAndFoldersToCheck);
    const fileTypesToIgnore = configManager.getValue<string[]>(ConfigKey.FileTypesAndFoldersToIgnore);
    const fileTypesToHide = configManager.getValue<string[]>(ConfigKey.FileTypesAndFoldersToHide);

    if (!fileTypesToCheck.includes(folderName) && 
        !fileTypesToIgnore.includes(folderName) && 
        !fileTypesToHide.includes(folderName)) {
        fileTypesToCheck.push(folderName);
        await configManager.setValue(ConfigKey.FileTypesAndFoldersToCheck, fileTypesToCheck);
    } else {
        vscode.window.showInformationMessage(`The folder "${folderName}" is already in one of the lists.`);
    }
};

export const handleFileTypeChange = async (item: string, targetList: ConfigKey) => {
    const configManager = ConfigManager.getInstance();
    const sourceList = targetList === ConfigKey.FileTypesAndFoldersToIgnore ? ConfigKey.FileTypesAndFoldersToCheck : ConfigKey.FileTypesAndFoldersToIgnore;
    const [sourceTypes, targetTypes] = [sourceList, targetList].map(list => configManager.getValue(list) as string[]);

    await Promise.all([
        configManager.setValue(sourceList, sourceTypes.filter(t => t !== item)),
        configManager.setValue(targetList, [...new Set([...targetTypes, item])])
    ]);
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

export const refreshFileTypes = async () => {
    const configManager = ConfigManager.getInstance();
    // Implement the logic to refresh file types if necessary
    console.log("Refreshing file types...");
    await configManager.syncAllSettings();
};