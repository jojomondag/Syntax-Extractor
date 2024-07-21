import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { detectWorkspaceFileTypes } from '../operations/initializeFileTypes'; // Add this import

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

                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
                console.log('Created .vscode/settings.json');
            } else {
                console.log('Existing settings.json found, not modifying it.');
            }
        } catch (error) {
            console.error('Failed to create or update .vscode/settings.json:', error);
            vscode.window.showErrorMessage('Failed to create or update .vscode/settings.json');
        }
    }
}
