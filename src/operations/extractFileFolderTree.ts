import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager, ConfigKey } from '../config/ConfigManager';
import { copyToClipboard } from '../commands';
import { processSelectedItems } from './processSelectedItems';
import { getAdjustedCommonDir } from '.';

export async function extractFileFolderTree(configManager: ConfigManager, contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    console.log("extractFileFolderTree: Function called");

    try {
        if (!allSelections || allSelections.length === 0) {
            vscode.window.showInformationMessage('No files or folders selected.');
            return;
        }

        const compressionLevel = configManager.getValue(ConfigKey.CompressionLevel);
        const commonDir = path.dirname(allSelections[0].fsPath);

        console.log(`Common Directory: ${commonDir}`);

        let pathsString = "";

        switch (compressionLevel) {
            case 3:
                pathsString = generatePathStringCompressionHard(allSelections, commonDir);
                break;
            case 2:
                pathsString = generatePathStringCompressionMedium(allSelections, commonDir);
                break;
            case 1:
                pathsString = generatePathStringCompressionLight(allSelections, commonDir);
                break;
            default:
                console.error('Unexpected compressionLevel:', compressionLevel);
                return;
        }

        console.log(`Generated Paths String: ${pathsString}`);
        await copyToClipboard(pathsString);
        vscode.window.showInformationMessage('Paths copied to clipboard!');
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error in extractFileFolderTree:', error.message);
            vscode.window.showErrorMessage(`An error occurred while generating the file tree: ${error.message}`);
        } else {
            console.error('Unknown error in extractFileFolderTree:', error);
            vscode.window.showErrorMessage('An unknown error occurred while generating the file tree.');
        }
    }
}

function generatePathStringCompressionHard(allSelections: vscode.Uri[], commonDir: string): string {
    const fileMap: { [directory: string]: string[] } = {};
    const adjustedCommonDir = getAdjustedCommonDir(allSelections, commonDir);
    processSelectedItems(allSelections, (filePath) => {
        let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        if (!fileMap[dir]) {
            fileMap[dir] = [];
        }
        fileMap[dir].push(path.basename(relativePath));
    }, (dirPath) => {
        let relativePath = path.relative(adjustedCommonDir, dirPath).replace(/\\/g, '/');
        if (!fileMap[relativePath]) {
            fileMap[relativePath] = [];
        }
    });
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
    const adjustedCommonDir = getAdjustedCommonDir(allSelections, commonDir);
    processSelectedItems(allSelections, (filePath) => {
        let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        if (!directoryMap[dir]) {
            directoryMap[dir] = [];
        }
        directoryMap[dir].push(path.basename(relativePath));
    }, (dirPath) => {
        let relativePath = path.relative(adjustedCommonDir, dirPath).replace(/\\/g, '/');
        if (!directoryMap[relativePath]) {
            directoryMap[relativePath] = [];
        }
    });
    const pathsList: string[] = [];
    Object.keys(directoryMap).sort().forEach(dir => {
        if (dir !== '.') {
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
    const adjustedCommonDir = getAdjustedCommonDir(allSelections, commonDir);
    processSelectedItems(allSelections, (filePath) => {
        let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        if (!directoryMap[dir]) {
            directoryMap[dir] = [];
        }
        directoryMap[dir].push(path.basename(relativePath));
    }, (dirPath) => {
        let relativePath = path.relative(adjustedCommonDir, dirPath).replace(/\\/g, '/');
        if (!directoryMap[relativePath]) {
            directoryMap[relativePath] = [];
        }
    });
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