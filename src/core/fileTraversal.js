const fs = require('fs').promises;
const path = require('path');
const { isText } = require('istextorbinary'); // Import isText from istextorbinary

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

// Function to recursively traverse a directory and gather information
const traverseDirectory = async (dir, level = 0, basePath = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let fileTypes = new Set(), files = new Set();
    let folderStructure = '', fileContents = '';

    // Get relative path of the current directory
    const relativeDirPath = path.relative(basePath, dir);
    if (relativeDirPath) {
        folderStructure += `${'  '.repeat(level)}├── ${path.basename(dir)}/\n`;
    }

    // If the directory is empty, add it to the folder structure
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
            // Ensure we only handle readable (text-based) files
            if (await isReadableFile(entryPath)) {
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
            } else {
                // For binary or unreadable files, indicate they are not processed
                folderStructure += `${indent}└── ${entry.name}\n`;
            }
        }
    }

    return { folderStructure, fileTypes, files, fileContents };
};

module.exports = { traverseDirectory };