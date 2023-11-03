import * as fs from 'fs';
import * as path from 'path';

export function walkDirectory(dir: string, rootPath: string, selectedFiles: Set<string>, prefix = ""): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results.push(prefix + path.basename(filePath));
            results = results.concat(walkDirectory(filePath, filePath, selectedFiles, prefix + "    "));
        } else {
            if (selectedFiles.has(filePath)) {
                selectedFiles.delete(filePath);
            }
            results.push(prefix + path.basename(filePath));
        }
    });

    return results;
}