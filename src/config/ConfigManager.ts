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
        return ConfigManager.instance ??= new ConfigManager();
    }

    private refreshConfiguration(): void {
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
    }

    public getValue<T extends ConfigValue>(key: ConfigKey): T {
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

    private onConfigChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('syntaxExtractor')) this.refreshConfiguration();
    }

    public async syncAllSettings(): Promise<void> {
        await Promise.all(Object.values(ConfigKey).map(async key => {
            const value = this.getValue(key);
            if (this.configuration.get(key) !== value) await this.setValue(key, value);
        }));
    }

    public getAllConfig(): Record<string, ConfigValue> {
        return Object.values(ConfigKey).reduce((config, key) => ({...config, [key]: this.getValue(key)}), {});
    }

    public async moveFileType(fileType: string, fromKey: ConfigKey, toKey: ConfigKey): Promise<void> {
        const fromArray = this.getValue<string[]>(fromKey);
        const toArray = this.getValue<string[]>(toKey);

        if (fromArray.includes(fileType) && !toArray.includes(fileType)) {
            await this.setValue(fromKey, fromArray.filter(ft => ft !== fileType));
            await this.setValue(toKey, [...toArray, fileType]);
        }
    }

    public async moveFileTypeToIgnore(fileType: string): Promise<void> {
        await this.moveFileType(fileType, ConfigKey.FileTypesAndFoldersToCheck, ConfigKey.FileTypesAndFoldersToIgnore);
    }

    public async moveFileTypeToHideFoldersAndFiles(fileType: string): Promise<void> {
        await this.moveFileType(fileType, ConfigKey.FileTypesAndFoldersToCheck, ConfigKey.FileTypesAndFoldersToHide);
    }
}