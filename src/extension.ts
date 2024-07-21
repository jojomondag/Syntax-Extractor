import * as vscode from 'vscode';
import { ConfigManager } from './config/ConfigManager';
import { registerCommands, registerTreeView } from './utils/registration';
import { ensureVscodeSettings } from './utils/settings';
import { initializeFileTypeConfiguration } from './operations/initializeFileTypes';

export async function activate(context: vscode.ExtensionContext) {
    await ensureVscodeSettings();
    const configManager = ConfigManager.getInstance();

    await initializeFileTypeConfiguration();

    await configManager.syncAllSettings();

    registerTreeView(context);
    registerCommands(context, configManager);
}

export function deactivate() {}