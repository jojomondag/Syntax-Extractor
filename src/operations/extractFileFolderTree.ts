import { path, vscode } from '..';
import { copyToClipboard } from '../commands';
import { processSelectedItems } from './processSelectedItems';
import { getConfig } from '../config/configUtil';

export function extractFileFolderTree(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    console.log('extractFileFolderTree function called');

    console.log('1: Fetching config');
    try {
        const config = getConfig();
        console.log('2: Fetched config:', config);

        const compressionLevel = config.compressionLevel;
        console.log('3: Compression level:', compressionLevel);

        const commonDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        console.log('4: Common directory:', commonDir);

        if (!commonDir) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        let pathsString = "";
        console.log('5: Setting up pathsString based on compressionLevel:', compressionLevel);
        switch (compressionLevel) {
            case 'hard':
                pathsString = generatePathStringCompressionHard(allSelections, commonDir);
                break;
            case 'medium':
                pathsString = generatePathStringCompressionMedium(allSelections, commonDir);
                break;
            case 'light':
                pathsString = generatePathStringCompressionLight(allSelections, commonDir);
                break;
            default:
                console.error('Unexpected compressionLevel:', compressionLevel);
                return;
        }

        console.log('6: Copying pathsString to clipboard:', pathsString);
        copyToClipboard(pathsString);
        vscode.window.showInformationMessage('Paths copied to clipboard!');
    } catch (error) {
        console.error('Error in extractFileFolderTree:', error);
    }
}
function generatePathStringCompressionHard(allSelections: vscode.Uri[], commonDir: string): string {
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
function generatePathStringCompressionMedium(allSelections: vscode.Uri[], commonDir: string): string {
    const directoryMap: { [directory: string]: string[] } = {};

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
            if (!directoryMap[dir]) {
                directoryMap[dir] = [];
            }
            directoryMap[dir].push(path.basename(relativePath));
        }
    );

    const pathsList: string[] = [];
    Object.keys(directoryMap).sort().forEach(dir => {
        if (dir !== '.') { // Exclude the root directory itself
            pathsList.push(dir);
            directoryMap[dir].sort().forEach(fileName => {
                pathsList.push('/' + fileName);
            });
        } else {
            directoryMap[dir].sort().forEach(fileName => {
                pathsList.push(fileName);
            });
        }
    });

    return `${adjustedCommonDir}\n${pathsList.join('\n')}`;
}
function generatePathStringCompressionLight(allSelections: vscode.Uri[], commonDir: string): string {
    const directoryMap: { [directory: string]: string[] } = {};

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
            if (!directoryMap[dir]) {
                directoryMap[dir] = [];
            }
            directoryMap[dir].push(path.basename(relativePath));
        }
    );

    let resultString = `${adjustedCommonDir}\n`;

    const sortedDirs = Object.keys(directoryMap).sort();
    sortedDirs.forEach((dir, index) => {
        const isLastDir = index === sortedDirs.length - 1;
        if (dir !== '.') { 
            resultString += `${isLastDir ? '└──' : '├──'} ${dir}\n`;
            directoryMap[dir].sort().forEach((fileName, fileIndex) => {
                const isLastFile = fileIndex === directoryMap[dir].length - 1;
                resultString += `    ${isLastFile ? '└──' : '├──'} ${fileName}\n`;
            });
        } else {
            directoryMap[dir].sort().forEach((fileName, fileIndex) => {
                const isLastFile = fileIndex === directoryMap[dir].length - 1;
                resultString += `${isLastFile ? '└──' : '├──'} ${fileName}\n`;
            });
        }
    });

    return resultString;
}