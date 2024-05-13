import * as vscode from 'vscode';
import { ConfigManager } from '../config/ConfigManager';

export async function initializeFileTypeConfiguration() {
    console.log('Forced reinitialization of file types.');
    const fileTypes = await detectWorkspaceFileTypes();
    const configManager = ConfigManager.getInstance();
    await configManager.setFileTypes(fileTypes);
}

export async function detectWorkspaceFileTypes(): Promise<string[]> {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000); // Adjust the pattern and exclude as necessary
    const fileTypes = files.map(file => {
        const parts = file.path.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : ''; // Add leading dot only if there's an extension
    }).filter((value, index, self) => value && self.indexOf(value) === index); // Remove duplicates and empty values
    return fileTypes;
}