import { vscode } from '..';

export function handleOpenWebpage() {
    vscode.env.openExternal(vscode.Uri.parse('https://chat.openai.com/'));
}