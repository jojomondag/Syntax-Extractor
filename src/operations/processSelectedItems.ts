import { fs, path, vscode } from '..';
import { ConfigManager } from '../config/ConfigManager';

// Instantiate ConfigManager
const configManager = new ConfigManager();

export function processSelectedItems(
    allSelections: vscode.Uri[],
    fileCallback: (filePath: string) => void,
    dirCallback?: (dirPath: string) => void
) {
    const processedFilesAndDirs = new Set<string>();

    function walkAndProcess(itemPath: string) {
        try {
            // Use ConfigManager to get excludedPaths
            if (configManager.excludedPaths.includes(itemPath)) {
                console.log(`Skipping excluded path: ${itemPath}`);
                return;
            }

            const stat = fs.statSync(itemPath);

            if (!processedFilesAndDirs.has(itemPath)) {
                if (stat && stat.isDirectory()) {
                    dirCallback && dirCallback(itemPath);
                    const list = fs.readdirSync(itemPath);
                    list.forEach(file => {
                        const filePath = path.join(itemPath, file);
                        walkAndProcess(filePath);
                    });
                }else {
                    const extension = path.extname(itemPath);
                    // Use ConfigManager to get fileTypes
                    if (configManager.fileTypes.includes(extension)) {
                        fileCallback(itemPath);
                    } else {
                        console.log(`Skipping non-text file: ${itemPath}`);
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
        walkAndProcess(itemPath);
    });
}