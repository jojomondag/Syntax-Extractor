import { fs, path, vscode } from '..';
import fileTypesToRead from '../config/fileTypesToRead.json';

export function processSelectedItems(
    allSelections: vscode.Uri[],
    fileCallback: (filePath: string) => void,
    dirCallback?: (dirPath: string) => void
) {
    const processedFilesAndDirs = new Set<string>();

    function walkAndProcess(itemPath: string) {
        const stat = fs.statSync(itemPath);

        if (!processedFilesAndDirs.has(itemPath)) {
            if (stat && stat.isDirectory()) {
                dirCallback && dirCallback(itemPath);
                const list = fs.readdirSync(itemPath);
                list.forEach(file => {
                    const filePath = path.join(itemPath, file);
                    walkAndProcess(filePath);
                });
            } else {
                const extension = path.extname(itemPath);
                if (fileTypesToRead.textExtensions.includes(extension)) {
                    fileCallback(itemPath);
                } else {
                    console.log(`Skipping non-text file: ${itemPath}`);
                }
            }
            processedFilesAndDirs.add(itemPath);
        }
    }

    allSelections.forEach(itemUri => {
        const itemPath = itemUri.fsPath;
        walkAndProcess(itemPath);
    });
}