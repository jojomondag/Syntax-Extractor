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
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
//Configmanager uses the singelton pattern to ensure that only one instance of the class is created.
class ConfigManager {
    constructor() {
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    getFileTypes() {
        return this.configuration.get('fileTypes', []);
    }
    setFileTypes(fileTypes) {
        return this.configuration.update('fileTypes', fileTypes, vscode.ConfigurationTarget.Workspace);
    }
    getCompressionLevel() {
        // Refresh the configuration reference to ensure it's current
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
        return this.configuration.get('compressionLevel', 1);
    }
    setCompressionLevel(level) {
        console.log(`Attempting to set compression level to: ${level}`);
        return this.configuration.update('compressionLevel', level, vscode.ConfigurationTarget.Workspace).then(() => {
            console.log(`Compression level set to: ${level}`);
            // Immediately after update, log the directly fetched value
            const directFetchTest = vscode.workspace.getConfiguration('syntaxExtractor').get('compressionLevel');
            console.log(`Direct fetch after set: ${directFetchTest}`);
        });
    }
    setClipboardDataBoxHeight(height) {
        return this.configuration.update('clipboardDataBoxHeight', height, vscode.ConfigurationTarget.Workspace);
    }
    getClipboardDataBoxHeight() {
        // Refresh the configuration reference to ensure it's current
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
        return this.configuration.get('clipboardDataBoxHeight', 100); // Default height: 100px
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map