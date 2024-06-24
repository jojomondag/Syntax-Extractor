import * as vscode from 'vscode';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';

export async function initializeFileTypeConfiguration() {
    console.log('Initializing file types.');
    const fileTypes = await detectWorkspaceFileTypes();
    const configManager = ConfigManager.getInstance();
    await configManager.setValue(ConfigKey.FileTypes, fileTypes);
    console.log('File types initialized:', fileTypes);
}

export async function detectWorkspaceFileTypes(): Promise<string[]> {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000);
    const fileTypes = files.map(file => {
        const parts = file.path.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
    }).filter((value): value is string => value !== '');
    return [...new Set(fileTypes)]; // Remove duplicates
}