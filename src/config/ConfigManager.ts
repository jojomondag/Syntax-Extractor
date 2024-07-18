import * as vscode from 'vscode';

export enum ConfigKey {
    FileTypes = 'fileTypes',
    FileTypesToIgnore = 'fileTypesToIgnore',
    CompressionLevel = 'compressionLevel',
    ClipboardDataBoxHeight = 'clipboardDataBoxHeight'
}

type ConfigValue = string[] | number;

export class ConfigManager {
    private static instance: ConfigManager;
    private configuration: vscode.WorkspaceConfiguration;
    private listeners: Map<ConfigKey, ((value: ConfigValue) => void)[]> = new Map();

    private constructor() {
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
        vscode.workspace.onDidChangeConfiguration(this.onConfigChange.bind(this));
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private refreshConfiguration() {
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
    }

    private get<T extends ConfigValue>(key: ConfigKey, defaultValue: T): T {
        this.refreshConfiguration();
        return this.configuration.get<T>(key, defaultValue);
    }

    private async set<T extends ConfigValue>(key: ConfigKey, value: T): Promise<void> {
        await this.configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
        this.refreshConfiguration();
        this.notifyListeners(key, value);
    }

    public getValue<T extends ConfigValue>(key: ConfigKey): T {
        switch (key) {
            case ConfigKey.FileTypes:
            case ConfigKey.FileTypesToIgnore:
                return this.get<string[]>(key, []) as T;
            case ConfigKey.CompressionLevel:
                return this.get<number>(key, 1) as T;
            case ConfigKey.ClipboardDataBoxHeight:
                return this.get<number>(key, 100) as T;
            default:
                throw new Error(`Unknown configuration key: ${key}`);
        }
    }

    public async setValue<T extends ConfigValue>(key: ConfigKey, value: T): Promise<void> {
        this.validateValue(key, value);
        await this.set(key, value);
    }

    private validateValue(key: ConfigKey, value: ConfigValue): void {
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

    public getAllConfig(): { [key in ConfigKey]: ConfigValue } {
        return {
            [ConfigKey.FileTypes]: this.getValue(ConfigKey.FileTypes),
            [ConfigKey.FileTypesToIgnore]: this.getValue(ConfigKey.FileTypesToIgnore),
            [ConfigKey.CompressionLevel]: this.getValue(ConfigKey.CompressionLevel),
            [ConfigKey.ClipboardDataBoxHeight]: this.getValue(ConfigKey.ClipboardDataBoxHeight)
        };
    }

    public async setAllConfig(config: Partial<{ [key in ConfigKey]: ConfigValue }>): Promise<void> {
        for (const [key, value] of Object.entries(config)) {
            await this.setValue(key as ConfigKey, value);
        }
    }

    public addListener(key: ConfigKey, listener: (value: ConfigValue) => void): void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(listener);
    }

    public removeListener(key: ConfigKey, listener: (value: ConfigValue) => void): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            const index = keyListeners.indexOf(listener);
            if (index > -1) {
                keyListeners.splice(index, 1);
            }
        }
    }

    private notifyListeners(key: ConfigKey, value: ConfigValue): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(listener => listener(value));
        }
    }

    private onConfigChange(event: vscode.ConfigurationChangeEvent): void {
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

    public isFileTypeOrFolderPresent(item: string): boolean {
        const fileTypes = this.getValue(ConfigKey.FileTypes) as string[];
        const fileTypesToIgnore = this.getValue(ConfigKey.FileTypesToIgnore) as string[];
        return fileTypes.includes(item) || fileTypesToIgnore.includes(item);
    }
}