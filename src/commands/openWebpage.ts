import * as vscode from 'vscode';

export function handleOpenWebpage() {
    const url = 'https://chat.openai.com/'; // Specify your URL here

    // Try to open or focus the URL
    vscode.env.openExternal(vscode.Uri.parse(url));
}