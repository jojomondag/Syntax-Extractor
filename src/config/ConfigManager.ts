import * as vscode from 'vscode';
import * as path from 'path';

export class ConfigManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('syntax-extractor');
    }

    get compressionLevel(): string {
        return this.config.get('compressionLevel') || 'medium';
    }

    set compressionLevel(level: string) {
        if(['hard', 'medium', 'light'].includes(level)) {
            this.config.update('compressionLevel', level, vscode.ConfigurationTarget.Workspace);
        } else {
            throw new Error("Invalid compression level value");
        }
    }

    get fileTypes(): string[] {
        return this.config.get('fileTypes') || [];
    }

    set fileTypes(types: string[]) {
        this.config.update('fileTypes', types, vscode.ConfigurationTarget.Workspace);
    }

    get excludedPaths(): string[] {
        return this.config.get('excludedPaths') || ['\\.git', '\\node_modules', '\\.eslintrc.json', '\\.gitignore', '\\.vscodeignore', '\\CHANGELOG.md', '\\package-lock.json', '\\README.md'];
    }

    set excludedPaths(paths: string[]) {
        this.config.update('excludedPaths', paths, vscode.ConfigurationTarget.Workspace);
    }

    get inputTextBoxHeight(): number {
        return this.config.get('inputTextBoxHeight') || 0;
    }

    set inputTextBoxHeight(height: number) {
        this.config.update('inputTextBoxHeight', height, vscode.ConfigurationTarget.Workspace);
    }

    public addFileType(fileType: string): void {
        const currentFileTypes = vscode.workspace.getConfiguration().get('syntax-extractor.fileTypes') as string[];
        if (!currentFileTypes.includes(fileType)) {
            currentFileTypes.push(fileType);
            vscode.workspace.getConfiguration().update('syntax-extractor.fileTypes', currentFileTypes, vscode.ConfigurationTarget.Global);
        }
    }

    public removeFileType(fileType: string): void {
        const currentFileTypes = this.fileTypes;
        const index = currentFileTypes.indexOf(fileType);
        if (index > -1) {
            currentFileTypes.splice(index, 1);
            this.fileTypes = currentFileTypes;
            vscode.workspace.getConfiguration().update('syntax-extractor.fileTypes', currentFileTypes, vscode.ConfigurationTarget.Global);
        }
    }

    public async updateFileTypes(types: string[]): Promise<void> {
        await this.config.update('fileTypes', types, vscode.ConfigurationTarget.Workspace);
    }
}