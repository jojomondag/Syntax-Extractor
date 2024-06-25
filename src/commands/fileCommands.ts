import fs from 'fs';
import path from 'path';
import chardet from 'chardet';

export function readTextFromFile(filePath: string): string {
    try {
        const buffer = fs.readFileSync(filePath);

        // Binary file check: look for null bytes in the first few thousand bytes
        if (isBinary(buffer)) {
            console.warn(`File ${filePath} appears to be binary. Skipping text conversion.`);
            return `${path.basename(filePath)}`;
        }

        // Detect encoding using chardet
        const detectedEncoding = chardet.detect(buffer);

        // List of Node.js supported encodings
        const supportedEncodings: BufferEncoding[] = [
            'ascii', 'utf8', 'utf-16le', 'ucs2', 'base64', 'latin1', 'binary', 'hex'
        ];

        // If detected encoding is supported, use it; otherwise, default to utf-8
        if (detectedEncoding && supportedEncodings.includes(detectedEncoding as BufferEncoding)) {
            return buffer.toString(detectedEncoding as BufferEncoding);
        } else {
            // Default to utf-8 if the encoding is not supported or undetectable
            console.warn(`${filePath}: ${detectedEncoding}. Defaulting to UTF-8.`);
            return buffer.toString('utf8');
        }
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return `Error reading file: ${path.basename(filePath)}`;
    }
}

function isBinary(buffer: Buffer): boolean {
    // A simple check for binary files is to see if there are any null bytes in the first few thousand bytes
    const length = buffer.length < 8000 ? buffer.length : 8000;
    for (let i = 0; i < length; i++) {
        if (buffer[i] === 0) {
            return true;
        }
    }
    return false;
}