import { fs, path, vscode } from '.';
import { extractAndCopyText, extractFileFolderTree, getTokenCount } from './operations';
import { handleOpenWebpage } from './commands/openWebpage';
import { configManager } from './config/ConfigManager';

let lastClipText = '';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "syntaxExtractor" is now active!');
    const treeDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('syntaxExtractorView', treeDataProvider);
    let disposable = vscode.commands.registerCommand('syntaxExtractor.openGui', () => {
        const panel = vscode.window.createWebviewPanel('webview', 'Syntax Extractor', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent(context, panel);
        setupClipboardPolling(panel);
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openWebpage':
                    handleOpenWebpage();
                    break;
                case 'setCompressionLevel':
                    configManager.compressionLevel = message.level;
                    break;
                case 'countTokens':
                    const tokenCount = getTokenCount(message.text);
                    panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
                    break;
                case 'countChars':
                    const charCount = message.text.length;
                    panel.webview.postMessage({ command: 'setCharCount', count: charCount });
                    break;
                case 'updateInputBoxHeight':
                    configManager.inputTextBoxHeight = message.height;
                    break;
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
    let extractFileFolderTreeDisposable = vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', extractFileFolderTree);
    context.subscriptions.push(extractFileFolderTreeDisposable);
    let extractAndCopyTextDisposable = vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', extractAndCopyText);
    context.subscriptions.push(extractAndCopyTextDisposable);
}
function setupClipboardPolling(panel: vscode.WebviewPanel) {
    setInterval(async () => {
        const clipText = await vscode.env.clipboard.readText();
        if (clipText !== lastClipText) {
            lastClipText = clipText;
            panel.webview.postMessage({ command: 'setClipboardContent', content: clipText });
            const tokenCount = getTokenCount(clipText);
            const charCount = clipText.length;
            panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
            panel.webview.postMessage({ command: 'setCharCount', count: charCount });
        }
    }, 800);
}
class MyDataProvider implements vscode.TreeDataProvider<string> {
    getTreeItem(element: string): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return { label: 'SE: Settings', command: { command: 'syntaxExtractor.openGui', title: 'SE: Settings' } };
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
    content = content.replace('</body>', `<script>document.getElementById('compressionLevel${capitalizeFirstLetter(currentCompressionLevel)}').classList.add('selected');</script></body>`);
    content = content.replace('<link rel="stylesheet" href="webview.css">', `<link rel="stylesheet" href="${cssUri}">`);
    content = content.replace('</body>', `<script src="${scriptUri}"></script></body>`);
    const inputTextBoxHeight = configManager.inputTextBoxHeight;
    content = content.replace('<textarea class="input-text-box" id="textInput" placeholder="Enter some text">', `<textarea class="input-text-box" id="textInput" placeholder="Enter some text" style="height: ${inputTextBoxHeight};">`);
    return content;
}
function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}