const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises; // Import the 'fs' module for reading file contents
const { isText } = require('istextorbinary'); // Import isText from istextorbinary
const { traverseDirectory } = require('../core/fileTraversal');
const { createHeader } = require('../core/utils');
const { writeToClipboard, showInfoMessage, showErrorMessage } = require('../services/vscodeServices');

// Function to determine if a URI is a directory
const isValidDirectory = async (uri) => {
    try {
        return (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
    } catch (error) {
        console.error('Error checking directory:', error);
        showInfoMessage('Please select a valid file or folder in the explorer.');
        return false;
    }
};

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

// Helper function to determine if a file is readable (text-based)
const isReadableFile = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath); // Read the file
        return isText(null, buffer); // Use istextorbinary to check if it's a text file
    } catch (error) {
        console.error(`Error reading file for readability check: ${filePath}`, error);
        return false; // Assume it's not readable if there's an error
    }
};

// Main function to extract code
const extractCode = async (uris) => {
    // Ensure uris is an array
    if (!Array.isArray(uris) || uris.length === 0) return;

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
            const isDir = await isValidDirectory(uri);
            if (isDir) {
                console.log('Starting extraction for directory:', uri.fsPath);
                const result = await traverseDirectory(uri.fsPath, 0, basePath);
                combineResults(combinedResult, result);
            } else {
                console.log('Starting extraction for file:', uri.fsPath);
                const result = await extractFile(uri.fsPath, basePath); // New function for single files
                combineResults(combinedResult, result);
            }
        }

        const headerContent = createHeader(combinedResult.fileTypes, combinedResult.files);
        const folderStructureOutput = `\n${basePath}\n${combinedResult.folderStructure}`; // Base path included once
        const finalContent = `${headerContent}\n\nFolder Structure:${folderStructureOutput}\n\nFile Contents:\n${formatFileContents(combinedResult.fileContents)}`;

        await writeToClipboard(finalContent);

        // Show success notification after successful extraction
        showInfoMessage('Extraction succeeded! Folder structure, file information, and contents copied to clipboard!');
    } catch (error) {
        console.error('Error in extractCode:', error);
        showErrorMessage(`An error occurred: ${error.message}`);
    }
};

// Helper function to combine results
const combineResults = (combinedResult, result) => {
    result.fileTypes.forEach(type => combinedResult.fileTypes.add(type));
    result.files.forEach(file => combinedResult.files.add(file));
    combinedResult.folderStructure += `${result.folderStructure}`;
    combinedResult.fileContents += result.fileContents;
};

// New function to handle single file extraction
const extractFile = async (filePath, basePath) => {
    const fileTypes = new Set();
    const files = new Set();
    const folderStructure = `└── ${path.basename(filePath)}\n`;
    let fileContents = '';

    files.add(path.relative(basePath, filePath));
    const ext = path.extname(filePath).slice(1);
    if (ext) fileTypes.add(ext);

    if (await isReadableFile(filePath)) {
        fileContents = await getFileContent(filePath, basePath); // Only get content for readable files
    } else {
        fileContents = `\n-- ${path.relative(basePath, filePath)}`;
    }

    return { folderStructure, fileTypes, files, fileContents };
};

// Function to read file content and format it
const getFileContent = async (filePath, basePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const relativeFilePath = path.relative(basePath, filePath);
        return `\n--- ${relativeFilePath} ---\n${content.trimEnd()}\n`;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return `\n--- ${filePath} ---\nError reading file: ${error.message}\n`;
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