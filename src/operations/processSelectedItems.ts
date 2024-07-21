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
    const fileTypesToIgnore = configManager.getValue(ConfigKey.FileTypesAndFoldersToIgnore) as string[];
    const allowedFileTypes = configManager.getValue(ConfigKey.FileTypesAndFoldersToCheck) as string[];

    function isAllowedFile(itemPath: string): boolean {
        const extension = path.extname(itemPath);
        return allowedFileTypes.includes(extension) && !fileTypesToIgnore.includes(extension);
    }

    function isIgnoredPath(itemPath: string): boolean {
        const normalizedPath = path.normalize(itemPath);
        // Check if any parent folder is in the ignore list
        let currentPath = normalizedPath;
        while (currentPath !== path.dirname(currentPath)) {
            if (fileTypesToIgnore.includes(path.basename(currentPath))) {
                return true;
            }
            currentPath = path.dirname(currentPath);
        }
        return false;
    }

    function walkAndProcess(itemPath: string) {
        try {
            if (processedFilesAndDirs.has(itemPath)) return;
            processedFilesAndDirs.add(itemPath);

            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                console.log(`Processing directory: ${itemPath}`);
                if (!isIgnoredPath(itemPath)) {
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
                console.log(`Processing file: ${itemPath}`);
                if (isAllowedFile(itemPath) && !isIgnoredPath(itemPath)) {
                    console.log(`File ${itemPath} is allowed and not ignored`);
                    fileCallback(itemPath);
                } else {
                    console.log(`File ${itemPath} is not allowed or is ignored`);
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