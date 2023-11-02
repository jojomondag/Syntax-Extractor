import { fs, path, vscode } from '.';
import { extractAndCopyText, extractFileFolderTree, getTokenCount  } from './operations';
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
                        configManager.compressionLevel = message.level;
                        break;
                    case 'countTokens':  // New case for handling token count
                        console.log('Send them tokens');
                        const tokenCount = getTokenCount(message.text);
                        panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
                        break;
                    // ... other existing cases ...
                    case 'updateInputBoxHeight':
                        configManager.inputTextBoxHeight = message.height;
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Read clipboard content and send it to the webview
        vscode.env.clipboard.readText().then((clipText) => {
            panel.webview.postMessage({ command: 'setClipboardContent', content: clipText });
        });
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
            label: 'SE: Settings',
            command: {
                command: 'syntaxExtractor.openGui',
                title: 'SE: Settings'
            }
        };
    }

    getChildren(element?: string): vscode.ProviderResult<string[]> {
        return ['SE: Settings'];
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

    // Set the height of the input text box using the value from the configManager
    const inputTextBoxHeight = configManager.inputTextBoxHeight;
    content = content.replace('<textarea class="input-text-box" id="textInput" placeholder="Enter some text">', `<textarea class="input-text-box" id="textInput" placeholder="Enter some text" style="height: ${inputTextBoxHeight};">`);


    return content;
}

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function deactivate() {}

