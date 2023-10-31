import { fs, path, vscode } from '.';
import { extractAndCopyText, extractFileFolderTree } from './operations';
import { handleOpenWebpage } from './commands/openWebpage';
import { configManager } from './config/ConfigManager';

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

        panel.webview.html = getWebviewContent(context, panel);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openWebpage':
                        handleOpenWebpage();
                        break;
                    case 'setCompressionLevel':
                        configManager.compressionLevel = message.level; // Use configManager to set compressionLevel
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
            label: 'Syntax Extractor Settings',
            command: {
                command: 'syntaxExtractor.openGui',
                title: 'Syntax Extractor Settings'
            }
        };
    }

    getChildren(element?: string): vscode.ProviderResult<string[]> {
        return ['Syntax Extractor Settings'];
    }
}

function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    const htmlPath = path.join(context.extensionPath, 'dist', 'webview', 'webview.html');
    let content = fs.readFileSync(htmlPath, 'utf8');

    const scriptPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview.js'));
    const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);

    const cssPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview', 'webview.css'));
    const cssUri = panel.webview.asWebviewUri(cssPathOnDisk);

    const currentCompressionLevel = configManager.compressionLevel;

    // Inject the configuration into the content to set the button color
    content = content.replace('</body>', `<script>
        document.getElementById('compressionLevel${capitalizeFirstLetter(currentCompressionLevel)}').classList.add('selected');
    </script></body>`);

    // Update the CSS and JS paths in the HTML content
    content = content.replace('<link rel="stylesheet" href="webview.css">', `<link rel="stylesheet" href="${cssUri}">`);
    content = content.replace('</body>', `<script src="${scriptUri}"></script></body>`);

    return content;
}
function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function deactivate() {}
