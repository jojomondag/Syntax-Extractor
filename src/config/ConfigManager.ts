import * as vscode from 'vscode';

//Configmanager uses the singelton pattern to ensure that only one instance of the class is created.
export class ConfigManager {
    private static instance: ConfigManager;
    private configuration: vscode.WorkspaceConfiguration;

    private constructor() {
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    getFileTypes(): string[] {
        return this.configuration.get('fileTypes', []);
    }

    setFileTypes(fileTypes: string[]): Thenable<void> {
        return this.configuration.update('fileTypes', fileTypes, vscode.ConfigurationTarget.Workspace);
    }

    getCompressionLevel(): number {
        // Refresh the configuration reference to ensure it's current
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
        return this.configuration.get('compressionLevel', 1);
    }

    setCompressionLevel(level: number): Thenable<void> {
        console.log(`Attempting to set compression level to: ${level}`);
        return this.configuration.update('compressionLevel', level, vscode.ConfigurationTarget.Workspace).then(() => {
            console.log(`Compression level set to: ${level}`);
            // Immediately after update, log the directly fetched value
            const directFetchTest = vscode.workspace.getConfiguration('syntaxExtractor').get('compressionLevel');
            console.log(`Direct fetch after set: ${directFetchTest}`);
        });
    }

    setClipboardDataBoxHeight(height: number): Thenable<void> {
        return this.configuration.update('clipboardDataBoxHeight', height, vscode.ConfigurationTarget.Workspace);
    }

    getClipboardDataBoxHeight(): number {
        // Refresh the configuration reference to ensure it's current
        this.configuration = vscode.workspace.getConfiguration('syntaxExtractor');
        return this.configuration.get<number>('clipboardDataBoxHeight', 100); // Default height: 100px
    }
}