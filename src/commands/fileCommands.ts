import fs from 'fs';
import path from 'path';
import chardet from 'chardet';

export function readTextFromFile(filePath: string): string {
    try {
        const buffer = fs.readFileSync(filePath);
        
        if (isBinary(buffer)) {
            console.warn(`File ${filePath} appears to be binary. Skipping text conversion.`);
            return path.basename(filePath);
        }

        const detectedEncoding = chardet.detect(buffer) as BufferEncoding;
        const encoding = ['ascii', 'utf8', 'utf-16le', 'ucs2', 'base64', 'latin1', 'binary', 'hex'].includes(detectedEncoding) 
            ? detectedEncoding 
            : 'utf8';

        if (encoding !== detectedEncoding) {
            console.warn(`${filePath}: ${detectedEncoding}. Defaulting to UTF-8.`);
        }

        return buffer.toString(encoding);
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return `Error reading file: ${path.basename(filePath)}`;
    }
}

function isBinary(buffer: Buffer): boolean {
    return buffer.slice(0, 8000).includes(0);
}