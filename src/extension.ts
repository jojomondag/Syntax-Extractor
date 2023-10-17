// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
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

        panel.webview.html = getWebviewContent();

		//Opens the WebPage

		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'openWebpage':
						vscode.env.openExternal(vscode.Uri.parse('https://example.com'));
						return;
				}
			},
			undefined,
			context.subscriptions
		);
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Syntax Extractor</title>
        </head>
        <body>
            <button id="openWebpageButton">Open Webpage</button>

            <script>
                document.getElementById('openWebpageButton').addEventListener('click', () => {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({ command: 'openWebpage' });
                });
            </script>
        </body>
        </html>
    `;
}


// This method is called when your extension is deactivated
export function deactivate() {}