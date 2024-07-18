import * as vscode from 'vscode';
import { ConfigManager } from './config/ConfigManager';
import { initializeFileTypeConfiguration } from './operations/initializeFileTypes';
import { registerCommands, registerTreeView } from './utils/registration';

export async function activate(context: vscode.ExtensionContext) {
    const configManager = ConfigManager.getInstance();
    registerTreeView(context);
    registerCommands(context, configManager);

    await initializeFileTypeConfiguration();
}

export function deactivate() {}
