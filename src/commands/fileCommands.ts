import { fs } from '..';

export function readTextFromFile(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return '';
    }
}