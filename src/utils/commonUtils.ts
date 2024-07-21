import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { detectWorkspaceFileTypes } from '../operations/initializeFileTypes';

export const updateConfig = async (key: ConfigKey, value: any) => 
    await ConfigManager.getInstance().setValue(key, value);

export const handleFileTypeChange = async (configManager: ConfigManager, item: string, targetList: ConfigKey) => {
    const sourceList = targetList === ConfigKey.FileTypesAndFoldersToIgnore ? ConfigKey.FileTypesAndFoldersToCheck : ConfigKey.FileTypesAndFoldersToIgnore;
    const [sourcetypes, targettypes] = [sourceList, targetList].map(list => configManager.getValue(list) as string[]);

    await Promise.all([
        configManager.setValue(sourceList, sourcetypes.filter(t => t !== item)),
        configManager.setValue(targetList, [...new Set([...targettypes, item])])
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

export const refreshFileTypes = async (): Promise<string[]> => {
    const configManager = ConfigManager.getInstance();
    const fileTypes = (await detectWorkspaceFileTypes()).filter((type): type is string => typeof type === 'string');
    const hideFoldersAndFiles = configManager.getValue(ConfigKey.FileTypesAndFoldersToHide) as string[];
    
    const updatedFileTypes = fileTypes.filter(type => !hideFoldersAndFiles.includes(type));
    
    await Promise.all([
        updateConfig(ConfigKey.FileTypesAndFoldersToCheck, updatedFileTypes),
        updateConfig(ConfigKey.FileTypesAndFoldersToIgnore, [])
    ]);
    return updatedFileTypes;
};

export async function ensureVscodeSettings() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const settingsPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'settings.json');
        try {
            await fs.mkdir(path.dirname(settingsPath), { recursive: true });

            let settings: any = {};
            let isNewFile = false;

            try {
                const existingSettings = await fs.readFile(settingsPath, 'utf8');
                settings = JSON.parse(existingSettings);
            } catch {
                isNewFile = true;
            }

            if (isNewFile || Object.keys(settings).length === 0) {
                const allFileTypes = await detectWorkspaceFileTypes();
                settings['syntaxExtractor.fileTypesAndFoldersToCheck'] = allFileTypes;
                settings['syntaxExtractor.fileTypesAndFoldersToIgnore'] = [];
                settings['syntaxExtractor.fileTypesAndFoldersToHide'] = [];
                settings['syntaxExtractor.compressionLevel'] = 2;
                settings['syntaxExtractor.clipboardDataBoxHeight'] = 100;
            } else {
                // Ensure all default settings are set if they don't exist
                settings['syntaxExtractor.fileTypesAndFoldersToCheck'] = settings['syntaxExtractor.fileTypesAndFoldersToCheck'] || await detectWorkspaceFileTypes();
                settings['syntaxExtractor.fileTypesAndFoldersToIgnore'] = settings['syntaxExtractor.fileTypesAndFoldersToIgnore'] || [];
                settings['syntaxExtractor.fileTypesAndFoldersToHide'] = settings['syntaxExtractor.fileTypesAndFoldersToHide'] || [];
                settings['syntaxExtractor.compressionLevel'] = settings['syntaxExtractor.compressionLevel'] || 2;
                settings['syntaxExtractor.clipboardDataBoxHeight'] = settings['syntaxExtractor.clipboardDataBoxHeight'] || 100;
            }

            await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
            console.log('Ensured .vscode/settings.json');
        } catch (error) {
            console.error('Failed to create or update .vscode/settings.json:', error);
            vscode.window.showErrorMessage('Failed to create or update .vscode/settings.json');
        }
    }
}