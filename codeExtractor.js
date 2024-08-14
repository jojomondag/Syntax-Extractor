const vscode = require('vscode');
const { traverseDirectory } = require('./fileTraversal');
const { createHeader } = require('./utils');

async function extractCode(uri) {
    try {
        if (!uri || !(await isValidDirectory(uri))) {
            return;
        }

        const { folderStructure, fileTypes, folders, files, fileContents } = await traverseDirectory(uri.fsPath);
        const header = createHeader(fileTypes, folders, files);
        const finalContent = `${header}\n${folderStructure}\n\nFile Contents:\n${fileContents}`;

        await vscode.env.clipboard.writeText(finalContent);
        vscode.window.showInformationMessage('Folder structure, file information, and contents copied to clipboard!');
    } catch (error) {
        console.error('Error in extractCode:', error);
        vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
}

async function isValidDirectory(uri) {
    try {
        const stats = await vscode.workspace.fs.stat(uri);
        if (stats.type === vscode.FileType.Directory) {
            return true;
        }
        vscode.window.showInformationMessage('Please select a folder, not a file.');
    } catch (error) {
        vscode.window.showInformationMessage('Please select a folder in the explorer.');
    }
    return false;
}

module.exports = { extractCode };