import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { handleExtractStructure } from './commands/copyHierarchy';
import { handleOpenWebpage } from './commands/openWebpage';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "syntaxExtractor" is now active!');

    // Register the tree data provider for the activity bar view
    const treeDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('syntaxExtractorView', treeDataProvider);

    // Register the command
    let disposable = vscode.commands.registerCommand('syntaxExtractor.openGui', () => {
        const panel = vscode.window.createWebviewPanel(
            'webview',
            'Syntax Extractor',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent(context, panel);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'extractStructure':
                        //handleExtractStructure(context);
                        break;
                    case 'openWebpage':
                        handleOpenWebpage();
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    let getSelectedFilesDisposable = vscode.commands.registerCommand('syntaxExtractor.getSelectedFiles', handleExtractStructure);
    context.subscriptions.push(getSelectedFilesDisposable);

    context.subscriptions.push(disposable);
}

class MyDataProvider implements vscode.TreeDataProvider<string> {
    getTreeItem(element: string): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            label: 'Open GUI',
            command: {
                command: 'syntaxExtractor.openGui',
                title: 'Open GUI'
            }
        };
    }

    getChildren(element?: string): vscode.ProviderResult<string[]> {
        return ['Open GUI'];
    }
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
