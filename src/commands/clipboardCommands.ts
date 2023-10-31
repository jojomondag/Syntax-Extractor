import clipboardy from 'clipboardy';

export function copyToClipboard(text: string) {
    clipboardy.writeSync(text);
}