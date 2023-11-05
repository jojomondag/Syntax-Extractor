import { path, fs } from '../index';

class ConfigManager {
    private configPath = path.join(__dirname, 'config', 'config.json');
    private configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

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

    private saveConfig() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.configData, null, 4));
    }
}

export const configManager = new ConfigManager();