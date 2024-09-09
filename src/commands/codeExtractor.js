const vscode = require('vscode');
const path = require('path');
const { traverseDirectory } = require('../core/fileTraversal');
const { createHeader } = require('../core/utils');
const { writeToClipboard, showInfoMessage, showErrorMessage } = require('../services/vscodeServices');

// Improved function to find the true common base path for a list of paths
const findCommonBasePath = (paths) => {
    if (paths.length === 0) return '';
    
    // Split all paths by directory separator and find common parts
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
    // Ensure uris is an array
    if (!Array.isArray(uris) || uris.length === 0) return '';

    let combinedResult = {
        fileTypes: new Set(),
        files: new Set(),
        folderStructure: '',
        fileContents: ''
    };

    // Get all the selected paths
    const selectedPaths = uris.map(uri => uri.fsPath);

    // Determine the true common base path for the selected folders
    const basePath = findCommonBasePath(selectedPaths);
    console.log('True base path determined:', basePath);

    try {
        for (const uri of uris) {
            if (!(await isValidDirectory(uri))) continue;  // Check if the selected item is a valid directory

            console.log('Starting extraction for:', uri.fsPath);
            const result = await traverseDirectory(uri.fsPath, 0, basePath);  // Pass basePath to adjust relative paths

            console.log('Extraction complete for:', uri.fsPath, {
                fileTypesCount: result.fileTypes.size,
                filesCount: result.files.size,
                folderStructureLength: result.folderStructure.length,
                fileContentsLength: result.fileContents.length,
            });

            // Combine results
            result.fileTypes.forEach(type => combinedResult.fileTypes.add(type));
            result.files.forEach(file => combinedResult.files.add(file));

            // Directly append the relative folder structure without redundant headers
            combinedResult.folderStructure += `${result.folderStructure}`;
            combinedResult.fileContents += result.fileContents;
        }

        const headerContent = createHeader(combinedResult.fileTypes);
        const folderStructureOutput = `\n${basePath}\n${combinedResult.folderStructure}`;
        const finalContent = `${headerContent}\n\nFolder Structure:${folderStructureOutput}\n\nFile Contents:\n${formatFileContents(combinedResult.fileContents)}`;

        await writeToClipboard(finalContent);
        showInfoMessage('Folder structure, file information, and contents copied to clipboard!');

        return finalContent;  // Return the extracted content

    } catch (error) {
        console.error('Error in extractCode:', error);
        showErrorMessage(`An error occurred: ${error.message}`);
        return '';  // Return an empty string in case of error
    }
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

// Helper function to format file contents with simple headers
const formatFileContents = (contents) => {
    return contents.replace(/--- (.*?) ---/g, (match, p1) => {
        // Only show the filename (relative path) without the full path
        return `-${path.basename(p1)}-\n`;
    });
};

module.exports = { extractCode };