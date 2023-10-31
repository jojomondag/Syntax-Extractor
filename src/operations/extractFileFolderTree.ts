import { path, vscode } from '..';
import { copyToClipboard } from '../commands';
import { processSelectedItems } from './processSelectedItems';

export function extractFileFolderTree(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    const commonDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!commonDir) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const pathsString = generatePathStringCompressionLevel2(allSelections, commonDir);
    
    copyToClipboard(pathsString);
    vscode.window.showInformationMessage('Paths copied to clipboard!');
}

function generatePathStringCompressionLevel1(allSelections: vscode.Uri[], commonDir: string): string {
    let allPaths: string[] = [];

    let nextDirLevel = "";
    for (let selection of allSelections) {
        const relativePath = path.relative(commonDir, selection.fsPath);
        const splitPath = relativePath.split(path.sep);

        if (splitPath[0]) {
            nextDirLevel = splitPath[0];
            break;
        }
    }

    const adjustedCommonDir = path.join(commonDir, nextDirLevel);

    processSelectedItems(
        allSelections,
        (filePath) => { // File callback
            let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/'); // Normalize path separators
            allPaths.push(relativePath);
        },
        (dirPath) => { // Directory callback
            let relativePath = path.relative(adjustedCommonDir, dirPath).replace(/\\/g, '/'); // Normalize path separators
            allPaths.push(relativePath);
        }
    );

    return `${adjustedCommonDir}\n${allPaths.join('\n')}`;
}
function generatePathStringCompressionLevel2(allSelections: vscode.Uri[], commonDir: string): string {
    const fileMap: { [directory: string]: string[] } = {};

    let nextDirLevel = "";
    for (let selection of allSelections) {
        const relativePath = path.relative(commonDir, selection.fsPath);
        const splitPath = relativePath.split(path.sep);

        if (splitPath[0]) {
            nextDirLevel = splitPath[0];
            break;
        }
    }

    const adjustedCommonDir = path.join(commonDir, nextDirLevel);

    processSelectedItems(
        allSelections,
        (filePath) => { // File callback
            let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/'); // Normalize path separators
            const dir = path.dirname(relativePath);
            if (!fileMap[dir]) {
                fileMap[dir] = [];
            }
            fileMap[dir].push(path.basename(relativePath));
        },
        (dirPath) => { } // No need for Directory callback as we are grouping by directory.
    );

    const compressedPaths = [];
    for (let dir in fileMap) {
        if (fileMap[dir].length > 0) {
            compressedPaths.push(`${dir}\\${fileMap[dir].join(', ')}`);
        } else {
            compressedPaths.push(dir);
        }
    }

    return `${adjustedCommonDir}\n${compressedPaths.join('\n')}`;
}
