import { promises as fsPromises } from 'fs';
import * as path from 'path';

export async function walkDirectory(dir: string, selectedFiles: Set<string>, prefix = ""): Promise<string[]> {
    let results: string[] = [];
    try {
        const list = await fsPromises.readdir(dir);
    
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fsPromises.stat(filePath);
    
            if (stat && stat.isDirectory()) {
                results.push(prefix + path.basename(filePath));
                const subDirResults = await walkDirectory(filePath, selectedFiles, prefix + "    ");
                results.push(...subDirResults);
            } else {
                selectedFiles.delete(filePath);
                results.push(prefix + path.basename(filePath));
            }
        }
    } catch (error) {
        console.error(`Failed to walk directory ${dir}:`, error);
    }
    
    return results;
}