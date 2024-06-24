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
exports.extractFileFolderTree = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ConfigManager_1 = require("../config/ConfigManager");
const commands_1 = require("../commands");
const processSelectedItems_1 = require("./processSelectedItems");
const _1 = require(".");
async function extractFileFolderTree(configManager) {
    console.log("extractFileFolderTree: Function called");
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showInformationMessage('No workspace folder is opened.');
            return;
        }
        const selectedItems = workspaceFolders.map(folder => folder.uri);
        const compressionLevel = configManager.getValue(ConfigManager_1.ConfigKey.CompressionLevel);
        const commonDir = workspaceFolders[0].uri.fsPath;
        console.log(`Common Directory: ${commonDir}`);
        let pathsString = "";
        switch (compressionLevel) {
            case 3:
                pathsString = generatePathStringCompressionHard(selectedItems, commonDir);
                break;
            case 2:
                pathsString = generatePathStringCompressionMedium(selectedItems, commonDir);
                break;
            case 1:
                pathsString = generatePathStringCompressionLight(selectedItems, commonDir);
                break;
            default:
                console.error('Unexpected compressionLevel:', compressionLevel);
                return;
        }
        console.log(`Generated Paths String: ${pathsString}`);
        await (0, commands_1.copyToClipboard)(pathsString);
        vscode.window.showInformationMessage('Paths copied to clipboard!');
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error in extractFileFolderTree:', error.message);
            vscode.window.showErrorMessage(`An error occurred while generating the file tree: ${error.message}`);
        }
        else {
            console.error('Unknown error in extractFileFolderTree:', error);
            vscode.window.showErrorMessage('An unknown error occurred while generating the file tree.');
        }
    }
}
exports.extractFileFolderTree = extractFileFolderTree;
function generatePathStringCompressionHard(allSelections, commonDir) {
    const fileMap = {};
    const adjustedCommonDir = (0, _1.getAdjustedCommonDir)(allSelections, commonDir);
    (0, processSelectedItems_1.processSelectedItems)(allSelections, (filePath) => {
        let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        if (!fileMap[dir]) {
            fileMap[dir] = [];
        }
        fileMap[dir].push(path.basename(relativePath));
    }, (dirPath) => { });
    const compressedPaths = [];
    for (let dir in fileMap) {
        if (fileMap[dir].length > 0) {
            compressedPaths.push(`${dir}\\${fileMap[dir].join(', ')}`);
        }
        else {
            compressedPaths.push(dir);
        }
    }
    return `${adjustedCommonDir}\n${compressedPaths.join('\n')}`;
}
function generatePathStringCompressionMedium(allSelections, commonDir) {
    const directoryMap = {};
    const adjustedCommonDir = (0, _1.getAdjustedCommonDir)(allSelections, commonDir);
    (0, processSelectedItems_1.processSelectedItems)(allSelections, (filePath) => {
        let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        if (!directoryMap[dir]) {
            directoryMap[dir] = [];
        }
        directoryMap[dir].push(path.basename(relativePath));
    });
    const pathsList = [];
    Object.keys(directoryMap).sort().forEach(dir => {
        if (dir !== '.') {
            pathsList.push(dir);
            directoryMap[dir].sort().forEach(fileName => {
                pathsList.push('/' + fileName);
            });
        }
        else {
            directoryMap[dir].sort().forEach(fileName => {
                pathsList.push(fileName);
            });
        }
    });
    return `${adjustedCommonDir}\n${pathsList.join('\n')}`;
}
function generatePathStringCompressionLight(allSelections, commonDir) {
    const directoryMap = {};
    const adjustedCommonDir = (0, _1.getAdjustedCommonDir)(allSelections, commonDir);
    (0, processSelectedItems_1.processSelectedItems)(allSelections, (filePath) => {
        let relativePath = path.relative(adjustedCommonDir, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        if (!directoryMap[dir]) {
            directoryMap[dir] = [];
        }
        directoryMap[dir].push(path.basename(relativePath));
    });
    let resultString = `${adjustedCommonDir}\n`;
    const sortedDirs = Object.keys(directoryMap).sort();
    sortedDirs.forEach((dir, index) => {
        const isLastDir = index === sortedDirs.length - 1;
        if (dir !== '.') {
            resultString += `${isLastDir ? '└──' : '├──'} ${dir}\n`;
            directoryMap[dir].sort().forEach((fileName, fileIndex) => {
                const isLastFile = fileIndex === directoryMap[dir].length - 1;
                resultString += `    ${isLastFile ? '└──' : '├──'} ${fileName}\n`;
            });
        }
        else {
            directoryMap[dir].sort().forEach((fileName, fileIndex) => {
                const isLastFile = fileIndex === directoryMap[dir].length - 1;
                resultString += `${isLastFile ? '└──' : '├──'} ${fileName}\n`;
            });
        }
    });
    return resultString;
}
//# sourceMappingURL=extractFileFolderTree.js.map