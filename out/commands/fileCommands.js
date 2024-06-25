"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTextFromFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chardet_1 = __importDefault(require("chardet"));
function readTextFromFile(filePath) {
    try {
        const buffer = fs_1.default.readFileSync(filePath);
        // Binary file check: look for null bytes in the first few thousand bytes
        if (isBinary(buffer)) {
            console.warn(`File ${filePath} appears to be binary. Skipping text conversion.`);
            return `${path_1.default.basename(filePath)}`;
        }
        // Detect encoding using chardet
        const detectedEncoding = chardet_1.default.detect(buffer);
        // List of Node.js supported encodings
        const supportedEncodings = [
            'ascii', 'utf8', 'utf-16le', 'ucs2', 'base64', 'latin1', 'binary', 'hex'
        ];
        // If detected encoding is supported, use it; otherwise, default to utf-8
        if (detectedEncoding && supportedEncodings.includes(detectedEncoding)) {
            return buffer.toString(detectedEncoding);
        }
        else {
            // Default to utf-8 if the encoding is not supported or undetectable
            console.warn(`${filePath}: ${detectedEncoding}. Defaulting to UTF-8.`);
            return buffer.toString('utf8');
        }
    }
    catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return `Error reading file: ${path_1.default.basename(filePath)}`;
    }
}
exports.readTextFromFile = readTextFromFile;
function isBinary(buffer) {
    // A simple check for binary files is to see if there are any null bytes in the first few thousand bytes
    const length = buffer.length < 8000 ? buffer.length : 8000;
    for (let i = 0; i < length; i++) {
        if (buffer[i] === 0) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=fileCommands.js.map