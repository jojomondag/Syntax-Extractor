"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTextFromFile = void 0;
const __1 = require("..");
function readTextFromFile(filePath) {
    try {
        return __1.fs.readFileSync(filePath, 'utf8');
    }
    catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        return '';
    }
}
exports.readTextFromFile = readTextFromFile;
//# sourceMappingURL=fileCommands.js.map