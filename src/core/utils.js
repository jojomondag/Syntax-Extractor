module.exports = {
    createHeader: (fileTypes) => {
        return `File types: ${Array.from(fileTypes).sort().join(', ')}`;
    }
};