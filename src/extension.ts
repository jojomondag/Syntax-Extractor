import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "syntaxExtractor" is now active!');

    let disposable = vscode.commands.registerCommand('syntaxExtractor.openGui', () => {
        const panel = vscode.window.createWebviewPanel(
            'webview',
            'Syntax Extractor',
            vscode.ViewColumn.One,
            {
                // Enable scripts in the webview
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent(context, panel);  // Updated line

        panel.webview.onDidReceiveMessage(
            message => {
                console.log("message received");
                switch (message.command) {
                    case 'openWebpage':
                        vscode.env.openExternal(vscode.Uri.parse('https://chat.openai.com/'));
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    const filePath = path.join(context.extensionPath, 'dist', 'webview.html');
    let content = fs.readFileSync(filePath, 'utf8');

    const scriptPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview.js'));
    const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
    content = content.replace(
        new RegExp('src="webview.js"', 'g'),
        `src="${scriptUri}"`
    );

    return content;
}

export function deactivate() {}
