module.exports = {
    createHeader: (fileTypes, files) => {
        const sections = [
            { label: 'File types', items: fileTypes },
            { label: 'Files', items: files }
        ];

        return sections.map(({ label, items }) => 
            `${label}: ${Array.from(items).sort().join(', ')}`
        ).join('\n');
    }
};
