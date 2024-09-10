const fs = require('fs').promises;
const path = require('path');
const { isBinary } = require('istextorbinary');

const traverseDirectory = async (dir, level = 0, basePath = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let fileTypes = new Set(), files = new Set();
    let folderStructure = '', fileContents = '';

    const relativeDirPath = path.relative(basePath, dir);
    if (relativeDirPath) {
        const dirParts = relativeDirPath.split(path.sep);
        dirParts.forEach((part, index) => {
            folderStructure += `${'  '.repeat(level + index)}├── ${part}/\n`;
        });
        level += dirParts.length - 1;
    }

    const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const entryPath = path.join(dir, entry.name);
        const indent = '  '.repeat(level + 1);
        const isLast = i === sortedEntries.length - 1;
        const prefix = isLast ? '└── ' : '├── ';

        if (entry.isDirectory()) {
            const subResult = await traverseDirectory(entryPath, level + 1, basePath);
            folderStructure += subResult.folderStructure;
            fileContents += subResult.fileContents;
            subResult.fileTypes.forEach(type => fileTypes.add(type));
            subResult.files.forEach(file => files.add(file));
        } else {
            const fileRelativePath = path.relative(basePath, entryPath);
            files.add(fileRelativePath);
            folderStructure += `${indent}${prefix}${entry.name}\n`;

            const ext = path.extname(entry.name).toLowerCase().slice(1);
            if (ext) fileTypes.add(ext);

            fileContents += await getFileContent(entryPath, basePath);
        }
    }

    return { folderStructure, fileTypes, files, fileContents };
};

const getFileContent = async (filePath, basePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        const relativeFilePath = path.relative(basePath, filePath);

        if (!isBinary(null, buffer)) {
            let content;
            try {
                content = buffer.toString('utf8');
            } catch (error) {
                console.warn(`Error decoding file as UTF-8: ${filePath}`, error);
                content = buffer.toString('latin1');  // Fallback to Latin-1 encoding
            }
            return `\n-${relativeFilePath}-\n${content.trimEnd()}\n`;
        } else {
            return `\n--- ${relativeFilePath} (binary file)\n`;
        }
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return `\n-${filePath}-\nError reading file: ${error.message}\n`;
    }
};

module.exports = { traverseDirectory };