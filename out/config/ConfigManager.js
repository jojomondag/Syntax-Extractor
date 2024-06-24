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
exports.ConfigManager = exports.ConfigKey = void 0;
const vscode = __importStar(require("vscode"));
var ConfigKey;
(function (ConfigKey) {
    ConfigKey["FileTypes"] = "fileTypes";
    ConfigKey["FileTypesToIgnore"] = "fileTypesToIgnore";
    ConfigKey["CompressionLevel"] = "compressionLevel";
    ConfigKey["ClipboardDataBoxHeight"] = "clipboardDataBoxHeight";
})(ConfigKey = exports.ConfigKey || (exports.ConfigKey = {}));
class ConfigManager {
    constructor() {
        this.listeners = new Map();
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
        vscode.workspace.onDidChangeConfiguration(this.onConfigChange.bind(this));
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    refreshConfiguration() {
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
    }
    get(key, defaultValue) {
        this.refreshConfiguration();
        return this.configuration.get(key, defaultValue);
    }
    async set(key, value) {
        await this.configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
        this.refreshConfiguration();
        this.notifyListeners(key, value);
    }
    getValue(key) {
        switch (key) {
            case ConfigKey.FileTypes:
            case ConfigKey.FileTypesToIgnore:
                return this.get(key, []);
            case ConfigKey.CompressionLevel:
                return this.get(key, 1);
            case ConfigKey.ClipboardDataBoxHeight:
                return this.get(key, 100);
            default:
                throw new Error(`Unknown configuration key: ${key}`);
        }
    }
    async setValue(key, value) {
        this.validateValue(key, value);
        await this.set(key, value);
    }
    validateValue(key, value) {
        switch (key) {
            case ConfigKey.FileTypes:
            case ConfigKey.FileTypesToIgnore:
                if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
                    throw new Error(`Invalid value for ${key}. Expected array of strings.`);
                }
                break;
            case ConfigKey.CompressionLevel:
                if (typeof value !== 'number' || value < 1 || value > 3) {
                    throw new Error(`Invalid value for ${key}. Expected number between 1 and 3.`);
                }
                break;
            case ConfigKey.ClipboardDataBoxHeight:
                if (typeof value !== 'number' || value <= 0) {
                    throw new Error(`Invalid value for ${key}. Expected positive number.`);
                }
                break;
        }
    }
    getAllConfig() {
        return {
            [ConfigKey.FileTypes]: this.getValue(ConfigKey.FileTypes),
            [ConfigKey.FileTypesToIgnore]: this.getValue(ConfigKey.FileTypesToIgnore),
            [ConfigKey.CompressionLevel]: this.getValue(ConfigKey.CompressionLevel),
            [ConfigKey.ClipboardDataBoxHeight]: this.getValue(ConfigKey.ClipboardDataBoxHeight)
        };
    }
    async setAllConfig(config) {
        for (const [key, value] of Object.entries(config)) {
            await this.setValue(key, value);
        }
    }
    addListener(key, listener) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(listener);
    }
    removeListener(key, listener) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            const index = keyListeners.indexOf(listener);
            if (index > -1) {
                keyListeners.splice(index, 1);
            }
        }
    }
    notifyListeners(key, value) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(listener => listener(value));
        }
    }
    onConfigChange(event) {
        if (event.affectsConfiguration('syntaxExtractor')) {
            this.refreshConfiguration();
            for (const key of Object.values(ConfigKey)) {
                if (event.affectsConfiguration(`syntaxExtractor.${key}`)) {
                    const value = this.getValue(key);
                    this.notifyListeners(key, value);
                }
            }
        }
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map