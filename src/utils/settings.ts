import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function ensureVscodeSettings() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const settingsPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'settings.json');
        if (!fs.existsSync(settingsPath)) {
            const vscodeFolderPath = path.dirname(settingsPath);
            if (!fs.existsSync(vscodeFolderPath)) {
                fs.mkdirSync(vscodeFolderPath);
            }
            fs.writeFileSync(settingsPath, JSON.stringify({
                // Add your default settings here
                "syntaxExtractor.someSetting": true
            }, null, 4));
            vscode.window.showInformationMessage('Created .vscode/settings.json');
        }
    }
}
