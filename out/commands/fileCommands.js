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
        const detectedEncoding = chardet_1.default.detect(buffer);
        // Check if the detected encoding is non-null and attempt to convert buffer to string
        if (detectedEncoding) {
            return buffer.toString(detectedEncoding);
        }
        else {
            // Handle as binary data if no reliable text encoding is found
            console.error(`File ${filePath} appears to be binary or has an unsupported encoding.`);
            return `Cannot display contents: ${path_1.default.basename(filePath)}`;
        }
    }
    catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return path_1.default.basename(filePath); // Fallback to filename on error
    }
}
exports.readTextFromFile = readTextFromFile;
//# sourceMappingURL=fileCommands.js.map