import * as path from 'path';
import { fs, vscode } from '..';
import { ConfigManager } from '../config/ConfigManager';

// Get the instance of ConfigManager
const configManager = ConfigManager.getInstance();

export function processSelectedItems(
    allSelections: vscode.Uri[],
    fileCallback: (filePath: string) => void,
    dirCallback?: (dirPath: string) => void
) {
    const processedFilesAndDirs = new Set<string>();

    function walkAndProcess(itemPath: string) {
        try {
            const stat = fs.statSync(itemPath);

            if (!processedFilesAndDirs.has(itemPath)) {
                if (stat && stat.isDirectory()) {
                    console.log(`Processing directory: ${itemPath}`);
                    dirCallback && dirCallback(itemPath);
                    const list = fs.readdirSync(itemPath);
                    list.forEach(file => {
                        const filePath = path.join(itemPath, file);
                        walkAndProcess(filePath);
                    });
                } else {
                    const extension = path.extname(itemPath);
                    console.log(`Processing file: ${itemPath}, extension: ${extension}`);
                    if (configManager.getFileTypes().includes(extension)) {
                        console.log(`File ${itemPath} matches the file types in the configuration`);
                        fileCallback(itemPath);
                    } else {
                        console.log(`File ${itemPath} does not match the file types in the configuration`);
                    }
                }
                processedFilesAndDirs.add(itemPath);
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