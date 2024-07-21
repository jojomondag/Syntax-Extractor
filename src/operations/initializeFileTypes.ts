import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import * as vscode from 'vscode';

export async function initializeFileTypeConfiguration() {
    console.log('Checking if file types need initialization.');
    const configManager = ConfigManager.getInstance();
    const fileTypes = configManager.getValue(ConfigKey.FileTypesAndFoldersToCheck) as string[];

    if (fileTypes.length === 0) {
        console.log('File types are empty. Initializing...');
        const detectedTypes = await detectWorkspaceFileTypes();
        await configManager.setValue(ConfigKey.FileTypesAndFoldersToCheck, detectedTypes);
        console.log('File types initialized:', detectedTypes);
    } else {
        console.log('File types already initialized. Skipping.');
    }
}

export async function detectWorkspaceFileTypes(): Promise<string[]> {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000);
    const fileTypes = files.map(file => {
        const parts = file.path.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
    }).filter((value): value is string => value !== '');
    return [...new Set(fileTypes)];
}