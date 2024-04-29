import * as vscode from 'vscode';

// This will store our opened URLs
let openedUrls = new Set<string>();

export function handleOpenWebpage() {
    const url = 'https://chat.openai.com/'; // Specify your URL here

    // Check if the URL is already opened
    if (openedUrls.has(url)) {
        vscode.window.showInformationMessage('This URL is already opened, attempting to focus...');
    } else {
        openedUrls.add(url);
    }

    // Try to open or focus the URL
    vscode.env.openExternal(vscode.Uri.parse(url));
}
