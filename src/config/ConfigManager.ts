import { path, fs } from '../index';

class ConfigManager {
    private _compressionLevel: string;
    private _inputTextBoxHeight: string;
    private readonly configPath: string;

    constructor() {
        this.configPath = path.join(__dirname, 'config', 'config.json');
        const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        
        this._compressionLevel = configData.compressionLevel;
        this._inputTextBoxHeight = configData.inputTextBoxHeight;
    }
    get compressionLevel(): string {
        return this._compressionLevel;
    }

    set compressionLevel(level: string) {
        if(['hard', 'medium', 'light'].includes(level)) {
            this._compressionLevel = level;

            this.saveConfig();
        } else {
            throw new Error("Invalid compression level value");
        }
    }

    // Getter and Setter for inputTextBoxHeight
    get inputTextBoxHeight(): string {
        return this._inputTextBoxHeight;
    }

    set inputTextBoxHeight(height: string) {
        this._inputTextBoxHeight = height;

        // Save changes to config.json
        this.saveConfig();
    }

    // Function to save the current configuration to config.json
    private saveConfig() {
        const newConfig = {
            compressionLevel: this._compressionLevel,
            inputTextBoxHeight: this._inputTextBoxHeight
        };
        fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 4));
    }
}

export const configManager = new ConfigManager();
