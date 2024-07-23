import * as vscode from 'vscode';

export enum ConfigKey {
    FileTypesAndFoldersToCheck = 'fileTypesAndFoldersToCheck',
    FileTypesAndFoldersToIgnore = 'fileTypesAndFoldersToIgnore',
    FileTypesAndFoldersToHide = 'fileTypesAndFoldersToHide',
    CompressionLevel = 'compressionLevel',
    ClipboardDataBoxHeight = 'clipboardDataBoxHeight'
}

type ConfigValue = string[] | number;

export class ConfigManager {
    private static instance: ConfigManager;
    private configuration: vscode.WorkspaceConfiguration;

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

    public getValue<T extends ConfigValue>(key: ConfigKey): T {
        this.refreshConfiguration();
        return this.configuration.get<T>(key, this.getDefaultValue(key) as T);
    }

    public getDefaultValue<T extends ConfigValue>(key: ConfigKey): T {
        const defaults: Record<ConfigKey, ConfigValue> = {
            [ConfigKey.FileTypesAndFoldersToCheck]: [],
            [ConfigKey.FileTypesAndFoldersToIgnore]: [],
            [ConfigKey.FileTypesAndFoldersToHide]: [],
            [ConfigKey.CompressionLevel]: 2,
            [ConfigKey.ClipboardDataBoxHeight]: 100
        };
        return defaults[key] as T;
    }

    public async setValue<T extends ConfigValue>(key: ConfigKey, value: T): Promise<void> {
        await this.configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
        this.refreshConfiguration();
    }

    private onConfigChange(event: vscode.ConfigurationChangeEvent) {
        if (event.affectsConfiguration('syntaxExtractor')) {
            this.refreshConfiguration();
        }
    }

    public async syncAllSettings(): Promise<void> {
        for (const key of Object.values(ConfigKey)) {
            const value = this.getValue(key);
            if (this.configuration.get(key) !== value) {
                await this.setValue(key, value);
            }
        }
    }

    public async moveFileTypeToIgnore(fileType: string): Promise<void> {
        const currentToIgnore = this.getValue<string[]>(ConfigKey.FileTypesAndFoldersToIgnore);
        if (!currentToIgnore.includes(fileType)) {
            currentToIgnore.push(fileType);
            await this.setValue(ConfigKey.FileTypesAndFoldersToIgnore, currentToIgnore);
        }
    }

    public async moveFileTypeToHideFoldersAndFiles(fileType: string): Promise<void> {
        const currentToHide = this.getValue<string[]>(ConfigKey.FileTypesAndFoldersToHide);
        if (!currentToHide.includes(fileType)) {
            currentToHide.push(fileType);
            await this.setValue(ConfigKey.FileTypesAndFoldersToHide, currentToHide);
        }
    }

    public getAllConfig(): Record<string, ConfigValue> {
        const config: Record<string, ConfigValue> = {};
        for (const key of Object.values(ConfigKey)) {
            config[key] = this.getValue(key);
        }
        return config;
    }
}