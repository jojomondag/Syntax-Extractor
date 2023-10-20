// src/commands/copyHierarchy.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as vscode from 'vscode';

export function walkDirectory(dir: string, rootPath: string, prefix = ""): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        // Check if it's a directory
        if (stat && stat.isDirectory()) {
            // Add directory to array [comment out if you only want files]
            results.push(prefix + path.relative(rootPath, filePath));
            results = results.concat(walkDirectory(filePath, rootPath, prefix + "    "));
        } else {
            results.push(prefix + path.relative(rootPath, filePath));
        }
    });

    return results;
}

export function copyToClipboard(text: string) {
    const platform = process.platform;

    // Determine the command to use based on the platform
    let command;
    if (platform === 'win32') {
        command = 'clip';
    } else if (platform === 'darwin') {
        command = 'pbcopy';
    } else {
        command = 'xclip -selection clipboard';
    }

    // Execute the command
    execSync(command, { input: text });
}
export function handleExtractStructure(context: vscode.ExtensionContext) {
    const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (folderPath) {
        const structure = walkDirectory(folderPath, folderPath);
        copyToClipboard(structure.join('\n'));
        vscode.window.showInformationMessage('Folder structure copied to clipboard!');
    }
}