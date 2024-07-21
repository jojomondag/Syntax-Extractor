import * as vscode from 'vscode';

export enum ConfigKey {
    FileTypes = 'fileTypes',
    FileTypesToIgnore = 'fileTypesToIgnore',
    CompressionLevel = 'compressionLevel',
    ClipboardDataBoxHeight = 'clipboardDataBoxHeight',
    HideFoldersAndFiles = 'hideFoldersAndFiles'
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
        const defaultValues: { [K in ConfigKey]: ConfigValue } = {
            [ConfigKey.FileTypes]: [],
            [ConfigKey.FileTypesToIgnore]: [],
            [ConfigKey.HideFoldersAndFiles]: [],
            [ConfigKey.CompressionLevel]: 1,
            [ConfigKey.ClipboardDataBoxHeight]: 100
        };
        return this.get<T>(key, defaultValues[key] as T);
    }

    public async setValue<T extends ConfigValue>(key: ConfigKey, value: T): Promise<void> {
        this.validateValue(key, value);
        await this.set(key, value);
    }

    private validateValue(key: ConfigKey, value: ConfigValue): void {
        const validators: { [K in ConfigKey]: (val: ConfigValue) => boolean } = {
            [ConfigKey.FileTypes]: (val) => Array.isArray(val) && val.every(item => typeof item === 'string'),
            [ConfigKey.FileTypesToIgnore]: (val) => Array.isArray(val) && val.every(item => typeof item === 'string'),
            [ConfigKey.HideFoldersAndFiles]: (val) => Array.isArray(val) && val.every(item => typeof item === 'string'),
            [ConfigKey.CompressionLevel]: (val) => typeof val === 'number' && val >= 1 && val <= 3,
            [ConfigKey.ClipboardDataBoxHeight]: (val) => typeof val === 'number' && val > 0
        };

        if (!validators[key](value)) {
            throw new Error(`Invalid value for ${key}.`);
        }
    }

    private async moveFileType(fileType: string, fromKey: ConfigKey, toKey: ConfigKey): Promise<void> {
        const fromTypes = this.getValue(fromKey) as string[];
        const toTypes = this.getValue(toKey) as string[];

        const updatedFromTypes = fromTypes.filter(type => type !== fileType);
        const updatedToTypes = [...new Set([...toTypes, fileType])];

        await Promise.all([
            this.setValue(fromKey, updatedFromTypes),
            this.setValue(toKey, updatedToTypes)
        ]);
    }

    public async moveFileTypeToHideFoldersAndFiles(fileType: string): Promise<void> {
        await this.moveFileType(fileType, ConfigKey.FileTypes, ConfigKey.HideFoldersAndFiles);
    }

    public async moveFileTypeToIgnore(fileType: string): Promise<void> {
        await this.moveFileType(fileType, ConfigKey.FileTypes, ConfigKey.FileTypesToIgnore);
    }

    public getAllConfig(): { [key in ConfigKey]: ConfigValue } {
        return Object.values(ConfigKey).reduce((acc, key) => {
            acc[key] = this.getValue(key);
            return acc;
        }, {} as { [key in ConfigKey]: ConfigValue });
    }

    public async setAllConfig(config: Partial<{ [key in ConfigKey]: ConfigValue }>): Promise<void> {
        await Promise.all(Object.entries(config).map(([key, value]) => 
            this.setValue(key as ConfigKey, value)
        ));
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
        this.listeners.get(key)?.forEach(listener => listener(value));
    }

    private onConfigChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('syntaxExtractor')) {
            this.refreshConfiguration();
            Object.values(ConfigKey).forEach(key => {
                if (event.affectsConfiguration(`syntaxExtractor.${key}`)) {
                    this.notifyListeners(key, this.getValue(key));
                }
            });
        }
    }

    public async syncAllSettings(): Promise<void> {
        await this.setAllConfig(this.getAllConfig());
    }

    public isFileTypeOrFolderPresent(item: string): boolean {
        return [ConfigKey.FileTypes, ConfigKey.FileTypesToIgnore].some(key => 
            (this.getValue(key) as string[]).includes(item)
        );
    }
}