import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { detectWorkspaceFileTypes } from '../operations/initializeFileTypes';

export const updateConfig = async (key: ConfigKey, value: any) => 
    await ConfigManager.getInstance().setValue(key, value);

export const handleFileTypeChange = async (configManager: ConfigManager, item: string, targetList: ConfigKey) => {
    const sourceList = targetList === ConfigKey.FileTypesToIgnore ? ConfigKey.FileTypes : ConfigKey.FileTypesToIgnore;
    const [sourcetypes, targettypes] = [sourceList, targetList].map(list => configManager.getValue(list) as string[]);

    await Promise.all([
        configManager.setValue(sourceList, sourcetypes.filter(t => t !== item)),
        configManager.setValue(targetList, [...new Set([...targettypes, item])])
    ]);
};

export const updateWebviewFileTypes = async (panel: vscode.WebviewPanel) => {
    const configManager = ConfigManager.getInstance();
    const config = {
        fileTypes: configManager.getValue(ConfigKey.FileTypes),
        fileTypesToIgnore: configManager.getValue(ConfigKey.FileTypesToIgnore),
        hideFoldersAndFiles: configManager.getValue(ConfigKey.HideFoldersAndFiles)
    };
    panel.webview.postMessage({ command: 'updateFileTypes', ...config });
};

export const refreshFileTypes = async (): Promise<string[]> => {
    const configManager = ConfigManager.getInstance();
    const fileTypes = (await detectWorkspaceFileTypes()).filter((type): type is string => typeof type === 'string');
    const hideFoldersAndFiles = configManager.getValue(ConfigKey.HideFoldersAndFiles) as string[];
    
    const updatedFileTypes = fileTypes.filter(type => !hideFoldersAndFiles.includes(type));
    
    await Promise.all([
        updateConfig(ConfigKey.FileTypes, updatedFileTypes),
        updateConfig(ConfigKey.FileTypesToIgnore, [])
    ]);
    return updatedFileTypes;
};

export const ensureVscodeSettings = async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'settings.json');
    try {
        await fs.mkdir(path.dirname(settingsPath), { recursive: true });
        let settings = await fs.readFile(settingsPath, 'utf8').then(JSON.parse).catch(() => ({}));

        const defaultSettings = {
            'syntaxExtractor.fileTypes': await detectWorkspaceFileTypes(),
            'syntaxExtractor.fileTypesToIgnore': [],
            'syntaxExtractor.hideFoldersAndFiles': [],
            'syntaxExtractor.compressionLevel': 2,
            'syntaxExtractor.clipboardDataBoxHeight': 100
        };

        settings = { ...defaultSettings, ...settings };

        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
        console.log('Updated .vscode/settings.json');
    } catch (error) {
        console.error('Failed to create or update .vscode/settings.json:', error);
        vscode.window.showErrorMessage('Failed to create or update .vscode/settings.json');
    }
};