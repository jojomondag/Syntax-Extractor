function createHeader(fileTypes, folders, files) {
    const fileTypesString = Array.from(fileTypes).join(', ');
    const foldersString = Array.from(folders).join(', ');
    const filesString = Array.from(files).join(', ');
    return `File types: ${fileTypesString}\nFolders: ${foldersString}\nFiles: ${filesString}`;
}

module.exports = { createHeader };