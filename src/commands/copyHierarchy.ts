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
            // Adjusted to only include the directory name with a preceding backslash
            results.push(prefix + '\\' + path.basename(filePath));
            // Update rootPath to current directory as we descend into subdirectories
            results = results.concat(walkDirectory(filePath, filePath, prefix + "    "));
        } else {
            // If it's a file, simply add its path to the array
            results.push(prefix + '    ' + path.basename(filePath));  // Adjusted to indent files
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
export function handleExtractStructure(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    copyAllText(allSelections);
}
export function oldhandleExtractStructure(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    // Determine the common directory path
    const commonDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!commonDir) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    // Initialize an array to hold the paths of all files and folders
    let allPaths: string[] = [];

    // Iterate through all selected items
    allSelections.forEach(itemUri => {
        const itemPath = itemUri.fsPath;
        const stat = fs.statSync(itemPath);

        // Check if the item is a directory
        if (stat && stat.isDirectory()) {
            // If it's a directory, add the directory itself to the array
            allPaths.push(path.relative(commonDir, itemPath));
            // Then walk through it and collect all paths
            // The walkDirectory function will handle the indentation for nested directories
            const directoryPaths = walkDirectory(itemPath, commonDir, "    ");  // Indent nested paths
            allPaths = allPaths.concat(directoryPaths);
        } else {
            // If it's a file, simply add its path to the array
            allPaths.push(path.relative(commonDir, itemPath));
        }
    });

    // Add the common directory path at the top
    const pathsString = commonDir + '\n' + allPaths.join('\n');

    // Copy all paths to the clipboard
    copyToClipboard(pathsString);

    // Optionally, notify the user that the paths have been copied
    vscode.window.showInformationMessage('Paths copied to clipboard!');
}
function readTextFromFile(filePath: string): string {
    try {
        // Read file content as a string and return it
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return '';  // Return an empty string in case of an error
    }
}
export function copyAllText(allSelections: vscode.Uri[]) {
    let allText = '';
    
    function processItem(itemPath: string) {
        const stat = fs.statSync(itemPath);

        // Check if the item is a directory
        if (stat && stat.isDirectory()) {
            // If it's a directory, get a list of all items in the directory
            const list = fs.readdirSync(itemPath);

            // Iterate through each item in the directory
            list.forEach(file => {
                const filePath = path.join(itemPath, file);
                processItem(filePath);  // Recursively process each item
            });
        } else {
            // If it's a file, check if it has a text-based extension
            const textExtensions = ['.txt', '.js', '.ts', '.html', '.css', '.json', '.xml', '.md', '.yml', '.yaml'];
            const extension = path.extname(itemPath);
            if (textExtensions.includes(extension)) {
                // If it's a text file, simply read its text and append it to allText
                allText += readTextFromFile(itemPath) + '\n\n';  // Separate text of different files with two newlines
            } else {
                console.log(`Skipping non-text file: ${itemPath}`);
            }
        }
    }

    // Iterate through all selected items
    allSelections.forEach(itemUri => {
        const itemPath = itemUri.fsPath;
        processItem(itemPath);  // Process each selected item
    });
    
    if (allText) {
        // Copy all text to clipboard
        copyToClipboard(allText);
        vscode.window.showInformationMessage('Text copied to clipboard!');
    } else {
        vscode.window.showErrorMessage('No text files selected or failed to read text from files.');
    }
}