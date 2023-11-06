import * as vscode from 'vscode';

export async function copyToClipboard(text: string) {
    await vscode.env.clipboard.writeText(text);
}