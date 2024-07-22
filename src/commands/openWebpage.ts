import * as vscode from 'vscode';

export function handleOpenWebpage() {
    const url = 'https://chat.openai.com/';
    vscode.env.openExternal(vscode.Uri.parse(url));
}