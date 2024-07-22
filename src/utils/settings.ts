import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { detectWorkspaceFileTypes } from '../operations/initializeFileTypes';
import { updateWebviewFileTypes } from '../utils/webviewUtils';

export const ensureVscodeSettings = async () => {
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
            } catch (error) {
                console.log('settings.json not found or invalid, creating new file');
                isNewFile = true;
            }

            const allFileTypes = await detectWorkspaceFileTypes();
            const configManager = ConfigManager.getInstance();

            if (isNewFile || Object.keys(settings).length === 0) {
                settings['syntaxExtractor.fileTypesAndFoldersToCheck'] = allFileTypes;
                settings['syntaxExtractor.fileTypesAndFoldersToIgnore'] = [];
                settings['syntaxExtractor.fileTypesAndFoldersToHide'] = [];
                settings['syntaxExtractor.compressionLevel'] = 2;
                settings['syntaxExtractor.clipboardDataBoxHeight'] = 100;

                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));

                // Update ConfigManager with new settings
                await configManager.setValue(ConfigKey.FileTypesAndFoldersToCheck, allFileTypes);
                await configManager.setValue(ConfigKey.FileTypesAndFoldersToIgnore, []);
                await configManager.setValue(ConfigKey.FileTypesAndFoldersToHide, []);
                await configManager.setValue(ConfigKey.CompressionLevel, 2);
                await configManager.setValue(ConfigKey.ClipboardDataBoxHeight, 100);
            } else {
                // Ensure all required settings exist, add if missing
                if (!settings['syntaxExtractor.fileTypesAndFoldersToCheck']) {
                    settings['syntaxExtractor.fileTypesAndFoldersToCheck'] = allFileTypes;
                    await configManager.setValue(ConfigKey.FileTypesAndFoldersToCheck, allFileTypes);
                }
                if (!settings['syntaxExtractor.fileTypesAndFoldersToIgnore']) {
                    settings['syntaxExtractor.fileTypesAndFoldersToIgnore'] = [];
                    await configManager.setValue(ConfigKey.FileTypesAndFoldersToIgnore, []);
                }
                if (!settings['syntaxExtractor.fileTypesAndFoldersToHide']) {
                    settings['syntaxExtractor.fileTypesAndFoldersToHide'] = [];
                    await configManager.setValue(ConfigKey.FileTypesAndFoldersToHide, []);
                }
                if (!settings['syntaxExtractor.compressionLevel']) {
                    settings['syntaxExtractor.compressionLevel'] = 2;
                    await configManager.setValue(ConfigKey.CompressionLevel, 2);
                }
                if (!settings['syntaxExtractor.clipboardDataBoxHeight']) {
                    settings['syntaxExtractor.clipboardDataBoxHeight'] = 100;
                    await configManager.setValue(ConfigKey.ClipboardDataBoxHeight, 100);
                }

                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
            }

            // Update the webview with the current settings
            const globalPanel = vscode.window.createWebviewPanel(
                'syntaxExtractor',
                'Syntax Extractor',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            await updateWebviewFileTypes(globalPanel);

            console.log('settings.json has been updated or created');
        } catch (error) {
            console.error('Failed to create or update .vscode/settings.json:', error);
            vscode.window.showErrorMessage('Failed to create or update .vscode/settings.json');
        }
    }
};

export const activate = async (context: vscode.ExtensionContext) => {
    await ensureVscodeSettings();
};