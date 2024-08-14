const fs = require('fs').promises;
const path = require('path');
const { getFileExtensions } = require('./fileTypeDetector');

async function traverseDirectory(dir, level = 0) {
    let fileTypes = new Set();
    let folders = new Set();
    let files = new Set();
    let folderStructure = '';
    let fileContents = '';

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const indent = '  '.repeat(level);

        if (entry.isDirectory()) {
            const result = await processDirectory(entry, entryPath, level, indent, folderStructure, fileTypes, folders, files, fileContents);
            folderStructure = result.folderStructure;
            fileTypes = new Set([...fileTypes, ...result.fileTypes]);
            folders = new Set([...folders, ...result.folders]);
            files = new Set([...files, ...result.files]);
            fileContents = result.fileContents;
        } else {
            const result = await processFile(entry, entryPath, indent, folderStructure, fileTypes, files, fileContents);
            folderStructure = result.folderStructure;
            fileTypes = new Set([...fileTypes, ...result.fileTypes]);
            files = new Set([...files, ...result.files]);
            fileContents = result.fileContents;
        }
    }

    return { folderStructure, fileTypes: getFileExtensions(fileTypes), folders, files, fileContents };
}

async function processDirectory(entry, entryPath, level, indent, folderStructure, fileTypes, folders, files, fileContents) {
    folderStructure += `${indent}${entry.name}/\n`;
    folders.add(entry.name);
    const subResult = await traverseDirectory(entryPath, level + 1);
    folderStructure += subResult.folderStructure;
    fileContents += subResult.fileContents;
    return { 
        folderStructure, 
        fileTypes: new Set([...fileTypes, ...subResult.fileTypes]),
        folders: new Set([...folders, ...subResult.folders]),
        files: new Set([...files, ...subResult.files]),
        fileContents 
    };
}

async function processFile(entry, entryPath, indent, folderStructure, fileTypes, files, fileContents) {
    folderStructure += `${indent}${entry.name}\n`;
    files.add(entry.name);
    const ext = path.extname(entry.name).slice(1);
    if (ext) fileTypes.add(ext);

    try {
        const content = await fs.readFile(entryPath, 'utf8');
        fileContents += `\n--- ${entryPath} ---\n${content}\n`;
    } catch (error) {
        console.error(`Error reading file ${entryPath}:`, error);
        fileContents += `\n--- ${entryPath} ---\nError reading file: ${error.message}\n`;
    }

    return { folderStructure, fileTypes, files, fileContents };
}

module.exports = { traverseDirectory };