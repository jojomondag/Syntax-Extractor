import { path, fs } from '../index';

export function getConfig(): any {
    const configContent = fs.readFileSync(path.join(__dirname, 'config', 'config.json'), 'utf8');
    return JSON.parse(configContent);
}