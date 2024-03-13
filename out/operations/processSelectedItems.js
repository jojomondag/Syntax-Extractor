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
exports.processSelectedItems = void 0;
const path = __importStar(require("path"));
const __1 = require("..");
const ConfigManager_1 = require("../config/ConfigManager");
// Get the instance of ConfigManager
const configManager = ConfigManager_1.ConfigManager.getInstance();
function processSelectedItems(allSelections, fileCallback, dirCallback) {
    const processedFilesAndDirs = new Set();
    function walkAndProcess(itemPath) {
        try {
            const stat = __1.fs.statSync(itemPath);
            if (!processedFilesAndDirs.has(itemPath)) {
                if (stat && stat.isDirectory()) {
                    console.log(`Processing directory: ${itemPath}`);
                    dirCallback && dirCallback(itemPath);
                    const list = __1.fs.readdirSync(itemPath);
                    list.forEach(file => {
                        const filePath = path.join(itemPath, file);
                        walkAndProcess(filePath);
                    });
                }
                else {
                    const extension = path.extname(itemPath);
                    console.log(`Processing file: ${itemPath}, extension: ${extension}`);
                    if (configManager.getFileTypes().includes(extension)) {
                        console.log(`File ${itemPath} matches the file types in the configuration`);
                        fileCallback(itemPath);
                    }
                    else {
                        console.log(`File ${itemPath} does not match the file types in the configuration`);
                    }
                }
                processedFilesAndDirs.add(itemPath);
            }
        }
        catch (error) {
            console.error(`Error processing ${itemPath}:`, error);
            __1.vscode.window.showErrorMessage(`Error processing file or directory: ${itemPath}`);
        }
    }
    allSelections.forEach(itemUri => {
        const itemPath = itemUri.fsPath;
        console.log(`Starting to process: ${itemPath}`);
        walkAndProcess(itemPath);
    });
}
exports.processSelectedItems = processSelectedItems;
//# sourceMappingURL=processSelectedItems.js.map