import * as vscode from 'vscode';
import { ConfigManager } from './config/ConfigManager';
import { registerCommands, registerTreeView } from './utils/registration';
import { ensureVscodeSettings } from './utils/settings';
import { initializeFileTypeConfiguration } from './operations/initializeFileTypes';
import { globalPanel, updateWebviewFileTypes } from './utils/webviewUtils'; // Add this import

export const activate = async (context: vscode.ExtensionContext) => {
    await ensureVscodeSettings();
    const configManager = ConfigManager.getInstance();

    await initializeFileTypeConfiguration();
    await configManager.syncAllSettings();

    registerTreeView(context);
    registerCommands(context, configManager);

    // Initialize webview with current settings
    if (globalPanel) {
        await updateWebviewFileTypes(globalPanel);
    }
};

export const deactivate = () => {};
