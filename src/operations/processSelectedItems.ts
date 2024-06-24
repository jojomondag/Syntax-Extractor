import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const configManager = ConfigManager.getInstance();

export function processSelectedItems(
    allSelections: vscode.Uri[],
    fileCallback: (filePath: string) => void,
    dirCallback?: (dirPath: string) => void
) {
    const processedFilesAndDirs = new Set<string>();
    const ignoredItems = configManager.getValue(ConfigKey.FileTypesToIgnore) as string[];
    const fileTypes = configManager.getValue(ConfigKey.FileTypes) as string[];

    function isIgnored(itemPath: string): boolean {
        const normalizedPath = path.normalize(itemPath);
        // Check if any parent folder is in the ignore list
        let currentPath = normalizedPath;
        while (currentPath !== path.dirname(currentPath)) {
            if (ignoredItems.includes(path.basename(currentPath))) {
                return true;
            }
            currentPath = path.dirname(currentPath);
        }

        // If it's a file, check its extension
        const extension = path.extname(normalizedPath);
        return ignoredItems.includes(extension);
    }

    function walkAndProcess(itemPath: string) {
        try {
            if (processedFilesAndDirs.has(itemPath)) return;
            processedFilesAndDirs.add(itemPath);

            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                console.log(`Processing directory: ${itemPath}`);
                if (!isIgnored(itemPath)) {
                    dirCallback && dirCallback(itemPath);
                    const list = fs.readdirSync(itemPath);
                    list.forEach(file => {
                        const filePath = path.join(itemPath, file);
                        walkAndProcess(filePath);
                    });
                } else {
                    console.log(`Directory ${itemPath} is ignored`);
                }
            } else {
                const extension = path.extname(itemPath);
                console.log(`Processing file: ${itemPath}, extension: ${extension}`);
                if (!isIgnored(itemPath) && fileTypes.includes(extension)) {
                    console.log(`File ${itemPath} matches the file types in the configuration and is not ignored`);
                    fileCallback(itemPath);
                } else {
                    console.log(`File ${itemPath} does not match the file types in the configuration or is ignored`);
                }
            }
        } catch (error) {
            console.error(`Error processing ${itemPath}:`, error);
            vscode.window.showErrorMessage(`Error processing file or directory: ${itemPath}`);
        }
    }

    allSelections.forEach(itemUri => {
        const itemPath = itemUri.fsPath;
        console.log(`Starting to process: ${itemPath}`);
        walkAndProcess(itemPath);
    });
}