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
const ConfigManager_1 = require("../config/ConfigManager");
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const configManager = ConfigManager_1.ConfigManager.getInstance();
function processSelectedItems(allSelections, fileCallback, dirCallback) {
    const processedFilesAndDirs = new Set();
    const ignoredItems = configManager.getValue(ConfigManager_1.ConfigKey.FileTypesToIgnore);
    const fileTypes = configManager.getValue(ConfigManager_1.ConfigKey.FileTypes);
    function isIgnored(itemPath) {
        const normalizedPath = path.normalize(itemPath);
        // Check if any parent folder is in the ignore list
        let currentPath = normalizedPath;
        while (currentPath !== path.dirname(currentPath)) {
            if (ignoredItems.includes(path.basename(currentPath))) {
                return true;
            }
            currentPath = path.dirname(currentPath);
        }
        // If it's a file, check its extension
        const extension = path.extname(normalizedPath);
        return ignoredItems.includes(extension);
    }
    function walkAndProcess(itemPath) {
        try {
            if (processedFilesAndDirs.has(itemPath))
                return;
            processedFilesAndDirs.add(itemPath);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                console.log(`Processing directory: ${itemPath}`);
                if (!isIgnored(itemPath)) {
                    dirCallback && dirCallback(itemPath);
                    const list = fs.readdirSync(itemPath);
                    list.forEach(file => {
                        const filePath = path.join(itemPath, file);
                        walkAndProcess(filePath);
                    });
                }
                else {
                    console.log(`Directory ${itemPath} is ignored`);
                }
            }
            else {
                const extension = path.extname(itemPath);
                console.log(`Processing file: ${itemPath}, extension: ${extension}`);
                if (!isIgnored(itemPath) && fileTypes.includes(extension)) {
                    console.log(`File ${itemPath} matches the file types in the configuration and is not ignored`);
                    fileCallback(itemPath);
                }
                else {
                    console.log(`File ${itemPath} does not match the file types in the configuration or is ignored`);
                }
            }
        }
        catch (error) {
            console.error(`Error processing ${itemPath}:`, error);
            vscode.window.showErrorMessage(`Error processing file or directory: ${itemPath}`);
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