import { execSync } from 'child_process';

export function copyToClipboard(text: string) {
    const commands: { [key: string]: string } = {
        'win32': 'clip',
        'darwin': 'pbcopy',
        'linux': 'xclip -selection clipboard'
    };

    const cmd = commands[process.platform] || commands['linux'];
    execSync(cmd, { input: text });
}