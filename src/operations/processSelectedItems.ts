import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';

const configManager = ConfigManager.getInstance();

export function processSelectedItems(
    allSelections: vscode.Uri[],
    fileCallback: (filePath: string) => void,
    dirCallback?: (dirPath: string) => void
) {
    const processedFilesAndDirs = new Set<string>();
    const fileTypesToIgnore = configManager.getValue<string[]>(ConfigKey.FileTypesAndFoldersToIgnore);
    const allowedFileTypes = configManager.getValue<string[]>(ConfigKey.FileTypesAndFoldersToCheck);

    function isAllowedFile(itemPath: string): boolean {
        const extension = path.extname(itemPath);
        return allowedFileTypes.includes(extension) && !fileTypesToIgnore.includes(extension);
    }

    function isIgnoredPath(itemPath: string): boolean {
        const normalizedPath = path.normalize(itemPath);
        // Check if the path itself or any parent directory is in the ignore list
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
            if (processedFilesAndDirs.has(itemPath) || isIgnoredPath(itemPath)) {
                return;
            }
            processedFilesAndDirs.add(itemPath);

            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
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
                if (isAllowedFile(itemPath) && !isIgnoredPath(itemPath)) {
                    fileCallback(itemPath);
                }
            }
        } catch (error) {
            console.error(`Error processing ${itemPath}:`, error);
            vscode.window.showErrorMessage(`Error processing file or directory: ${itemPath}`);
        }
    }

    allSelections.forEach(itemUri => {
        const itemPath = itemUri.fsPath;
        walkAndProcess(itemPath);
    });
}