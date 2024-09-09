const vscode = require('vscode');
const path = require('path');
const { traverseDirectory } = require('../core/fileTraversal');
const { createHeader } = require('../core/utils');
const { writeToClipboard, showInfoMessage, showErrorMessage } = require('../services/vscodeServices');

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

const extractCode = async (uris) => {
    if (!Array.isArray(uris) || uris.length === 0) return '';

    const selectedPaths = uris.map(uri => uri.fsPath);
    const basePath = findCommonBasePath(selectedPaths);
    console.log('True base path determined:', basePath);

    try {
        const combinedResult = await processUris(uris, basePath);
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

const processUris = async (uris, basePath) => {
    let combinedResult = {
        fileTypes: new Set(),
        files: new Set(),
        folderStructure: '',
        fileContents: ''
    };

    for (const uri of uris) {
        if (!(await isValidDirectory(uri))) continue;

        console.log('Starting extraction for:', uri.fsPath);
        const result = await traverseDirectory(uri.fsPath, 0, basePath);
        
        console.log('Extraction complete for:', uri.fsPath, {
            fileTypesCount: result.fileTypes.size,
            filesCount: result.files.size,
            folderStructureLength: result.folderStructure.length,
            fileContentsLength: result.fileContents.length,
        });

        mergeResults(combinedResult, result);
    }

    return combinedResult;
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
    return `${headerContent}\n\nFolder Structure:${folderStructureOutput}\n\nFile Contents:\n${formatFileContents(combinedResult.fileContents)}`;
};

const isValidDirectory = async (uri) => {
    try {
        return (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
    } catch (error) {
        console.error('Error checking directory:', error);
        showInfoMessage('Please select a valid folder in the explorer.');
        return false;
    }
};

const formatFileContents = (contents) => {
    return contents.replace(/--- (.*?) ---/g, (match, p1) => `-${path.basename(p1)}-\n`);
};

module.exports = { extractCode };