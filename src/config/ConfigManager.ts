import { path, fs } from '../index';

class ConfigManager {
    private _compressionLevel: string;
    private readonly configPath: string;

    constructor() {
        this.configPath = path.join(__dirname, 'config', 'config.json');
        const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this._compressionLevel = configData.compressionLevel; // Initial value from config.json
    }

    get compressionLevel(): string {
        return this._compressionLevel;
    }

    set compressionLevel(level: string) {
        if(['hard', 'medium', 'light'].includes(level)) { // Ensure valid value is being set
            this._compressionLevel = level;
        
            // Update the config.json
            const newConfig = { compressionLevel: level };
            fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 4));
        } else {
            throw new Error("Invalid compression level value");
        }
    }
}

export const configManager = new ConfigManager();
