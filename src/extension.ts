import { fs, path, vscode } from '.';
import { extractAndCopyText, extractFileFolderTree } from './operations';
import { handleOpenWebpage } from './commands/openWebpage';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "syntaxExtractor" is now active!');

    // Register the tree data provider for the activity bar view
    const treeDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('syntaxExtractorView', treeDataProvider);

    // Register WebView commands
    let disposable = vscode.commands.registerCommand('syntaxExtractor.openGui', () => {
        const panel = vscode.window.createWebviewPanel(
            'webview',
            'Syntax Extractor',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        // Adjusting the path to point to the correct location of webview.html in the new structure
        panel.webview.html = getWebviewContent(context, panel);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openWebpage':
                        handleOpenWebpage();
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    let extractFileFolderTreeDisposable = vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', extractFileFolderTree);
    context.subscriptions.push(extractFileFolderTreeDisposable);

    let extractAndCopyTextDisposable = vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', extractAndCopyText);
    context.subscriptions.push(extractAndCopyTextDisposable);    

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
    const filePath = path.join(context.extensionPath, 'webview', 'webview.html'); 
    let content = fs.readFileSync(filePath, 'utf8');

    const scriptPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'webview', 'webview.ts'));
    const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
    content = content.replace(
        new RegExp('src="webview.ts"', 'g'),
        `src="${scriptUri}"`
    );

    return content;
}
export function deactivate() {}