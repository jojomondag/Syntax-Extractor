import fs from 'fs';
import path from 'path';
import chardet from 'chardet';

export function readTextFromFile(filePath: string): string {
    try {
        const buffer = fs.readFileSync(filePath);
        const detectedEncoding = chardet.detect(buffer) as BufferEncoding | null;

        // Check if the detected encoding is non-null and attempt to convert buffer to string
        if (detectedEncoding) {
            return buffer.toString(detectedEncoding);
        } else {
            // Handle as binary data if no reliable text encoding is found
            console.error(`File ${filePath} appears to be binary or has an unsupported encoding.`);
            return `Cannot display contents: ${path.basename(filePath)}`;
        }
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return path.basename(filePath); // Fallback to filename on error
    }
}
