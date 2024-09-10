const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { traverseDirectory } = require('../core/fileTraversal');
const { createHeader } = require('../core/utils');
const { writeToClipboard, showInfoMessage, showErrorMessage } = require('../services/vscodeServices');

const extractCode = async (uris) => {
    if (!Array.isArray(uris) || uris.length === 0) return '';

    const selectedPaths = uris.map(uri => uri.fsPath);
    const basePath = findCommonBasePath(selectedPaths);
    console.log('True base path determined:', basePath);

    try {
        let combinedResult = {
            fileTypes: new Set(),
            files: new Set(),
            folderStructure: '',
            fileContents: ''
        };

        for (const uri of uris) {
            const stats = await vscode.workspace.fs.stat(uri);
            if (stats.type === vscode.FileType.Directory) {
                const result = await traverseDirectory(uri.fsPath, 0, basePath);
                mergeResults(combinedResult, result);
            } else if (stats.type === vscode.FileType.File) {
                const fileContent = await fs.readFile(uri.fsPath, 'utf8');
                const relativeFilePath = path.relative(basePath, uri.fsPath);
                combinedResult.files.add(relativeFilePath);
                combinedResult.fileTypes.add(path.extname(uri.fsPath).slice(1).toLowerCase());
                combinedResult.fileContents += `\n-${relativeFilePath}-\n${fileContent.trimEnd()}\n`;
                
                // Add file to folder structure
                const pathParts = relativeFilePath.split(path.sep);
                let currentPath = '';
                pathParts.forEach((part, index) => {
                    const isLast = index === pathParts.length - 1;
                    const indent = '  '.repeat(index);
                    currentPath = path.join(currentPath, part);
                    if (isLast) {
                        combinedResult.folderStructure += `${indent}└── ${part}\n`;
                    } else {
                        combinedResult.folderStructure += `${indent}├── ${part}/\n`;
                    }
                });
            }
        }

        const finalContent = formatFinalContent(combinedResult, basePath);

        await writeToClipboard(finalContent);
        showInfoMessage('Folder structure, file information, and contents copied to clipboard!');

        return finalContent;
    } catch (error) {
        console.error('Error in extractCode:', error);
        showErrorMessage(`An error occurred: ${error.message}`);
        return '';
    }
};

const findCommonBasePath = (paths) => {
    if (paths.length === 0) return '';
    
    const splitPaths = paths.map(p => p.split(path.sep));
    const minLength = Math.min(...splitPaths.map(p => p.length));
    
    let commonBaseParts = [];
    
    for (let i = 0; i < minLength; i++) {
        const currentPart = splitPaths[0][i];
        if (splitPaths.every(parts => parts[i] === currentPart)) {
            commonBaseParts.push(currentPart);
        } else {
            break;
        }
    }

    return commonBaseParts.join(path.sep);
};

const mergeResults = (combinedResult, result) => {
    result.fileTypes.forEach(type => combinedResult.fileTypes.add(type));
    result.files.forEach(file => combinedResult.files.add(file));
    combinedResult.folderStructure += result.folderStructure;
    combinedResult.fileContents += result.fileContents;
};

const formatFinalContent = (combinedResult, basePath) => {
    const headerContent = createHeader(combinedResult.fileTypes);
    const folderStructureOutput = `\n${basePath}\n${combinedResult.folderStructure}`;
    return `${headerContent}\n\nFolder Structure:${folderStructureOutput}\n\nFile Contents:\n${combinedResult.fileContents}`;
};

module.exports = { extractCode };