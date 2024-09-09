const fs = require('fs').promises;
const path = require('path');
const { isBinary } = require('istextorbinary');

const traverseDirectory = async (dir, level = 0, basePath = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let fileTypes = new Set(), files = new Set();
    let folderStructure = '', fileContents = '';

    // Get relative path of the current directory
    const relativeDirPath = path.relative(basePath, dir);
    if (relativeDirPath) {
        folderStructure += `${'  '.repeat(level)}├── ${path.basename(dir)}/\n`;
    }

    // If the directory is empty, we add it to the folder structure
    if (entries.length === 0) {
        folderStructure += `${'  '.repeat(level + 1)}(empty)\n`;
    }

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const indent = '  '.repeat(level + 1);  // Indent for visualizing the folder structure

        if (entry.isDirectory()) {
            // Recursively traverse subdirectories
            const subResult = await traverseDirectory(entryPath, level + 1, basePath);
            folderStructure += subResult.folderStructure;  // Append subfolder structure
            fileContents += subResult.fileContents;  // Append file contents from subfolder

            // Merge sets from subdirectory results
            subResult.fileTypes.forEach(type => fileTypes.add(type));
            subResult.files.forEach(file => files.add(file));
        } else {
            // Add relative path of the file
            const fileRelativePath = path.relative(basePath, entryPath);
            files.add(fileRelativePath);

            // Use tree format for files
            folderStructure += `${indent}└── ${entry.name}\n`;

            // Determine file type by extension
            const ext = path.extname(entry.name).slice(1);
            if (ext) fileTypes.add(ext);

            // Read and store file content
            fileContents += await getFileContent(entryPath, basePath);
        }
    }

    return { folderStructure, fileTypes, files, fileContents };
};

const getFileContent = async (filePath, basePath) => {
    try {
        // Check if the file is binary
        if (await isBinaryFile(filePath)) {
            return `\n--- ${path.relative(basePath, filePath)}`;
        }

        const content = await fs.readFile(filePath, 'utf8');
        const relativeFilePath = path.relative(basePath, filePath);
        return `\n--- ${relativeFilePath} ---\n${content.trimEnd()}\n`;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return `\n--- ${filePath} ---\nError reading file: ${error.message}\n`;
    }
};

const isBinaryFile = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        return isBinary(null, buffer);
    } catch (error) {
        console.error(`Error checking if file is binary: ${filePath}`, error);
        return false; // Assume it's not binary if we can't check
    }
};

module.exports = { traverseDirectory };