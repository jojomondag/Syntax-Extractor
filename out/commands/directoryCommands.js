"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkDirectory = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
async function walkDirectory(dir, selectedFiles, prefix = "") {
    let results = [];
    try {
        const list = await fs_1.promises.readdir(dir);
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fs_1.promises.stat(filePath);
            if (stat && stat.isDirectory()) {
                results.push(prefix + path.basename(filePath));
                const subDirResults = await walkDirectory(filePath, selectedFiles, prefix + "    ");
                results.push(...subDirResults);
            }
            else {
                selectedFiles.delete(filePath);
                results.push(prefix + path.basename(filePath));
            }
        }
    }
    catch (error) {
        console.error(`Failed to walk directory ${dir}:`, error);
    }
    return results;
}
exports.walkDirectory = walkDirectory;
//# sourceMappingURL=directoryCommands.js.map