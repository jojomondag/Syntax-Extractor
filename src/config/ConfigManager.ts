// File: ConfigManager.ts
import { path, fs } from '../index'; // Adjust the import path as necessary

class ConfigManager {
    private configPath = path.join(__dirname, 'config', 'config.json');
    private configData: { [key: string]: any }; // Define the shape of your config or leave as any if not predefined

    constructor() {
        this.configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    }

    get compressionLevel(): string {
        return this.configData.compressionLevel;
    }

    set compressionLevel(level: string) {
        if(['hard', 'medium', 'light'].includes(level)) {
            this.configData.compressionLevel = level;
            this.saveConfig();
        } else {
            throw new Error("Invalid compression level value");
        }
    }

    get inputTextBoxHeight(): string {
        return this.configData.inputTextBoxHeight;
    }

    set inputTextBoxHeight(height: string) {
        this.configData.inputTextBoxHeight = height;
        this.saveConfig();
    }

    public getConfig(): { [key: string]: any } {
        return this.configData;
    }

    private saveConfig() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.configData, null, 4));
    }
}

export const configManager = new ConfigManager();
