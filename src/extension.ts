import { fs, path, vscode } from '.';
import { extractAndCopyText, extractFileFolderTree, getTokenCount } from './operations';
import { handleOpenWebpage } from './commands/openWebpage';
import { ConfigManager } from './config/ConfigManager';

let lastClipText = '';
let configManager = new ConfigManager();
let panel: vscode.WebviewPanel | null = null;

export function activate(context: vscode.ExtensionContext) {

    const treeDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('syntaxExtractorView', treeDataProvider);

    let disposable = vscode.commands.registerCommand('syntaxExtractor.openGui', () => {
        panel = vscode.window.createWebviewPanel('webview', 'Syntax Extractor', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent(context, panel);

        // Immediately send the current file types to the newly opened webview
        sendFileTypesToWebview(panel);

        // Add an event listener for when the webview panel's view state changes
        panel.onDidChangeViewState(e => {
            if (e.webviewPanel.visible) {
                // The webview panel is visible, send the updated file types
                if (panel !== null) {
                    sendFileTypesToWebview(panel);
                }
            }
        });

        let clipboardPollingInterval = setupClipboardPolling(panel, context);
        panel.onDidDispose(() => {
            clearInterval(clipboardPollingInterval);
            panel = null; // Reset the panel on dispose
        }, null, context.subscriptions);

        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'openWebpage':
                    handleOpenWebpage();
                    break;
                case 'setCompressionLevel':
                    configManager.compressionLevel = message.level;
                    break;
                case 'countTokens':
                    const tokenCount = getTokenCount(message.text);
                    if (panel) {
                        panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
                    }
                    break;
                case 'countChars':
                    const charCount = message.text.length;
                    if (panel) {
                        panel.webview.postMessage({ command: 'setCharCount', count: charCount });
                    }
                    break;
                case 'updateInputBoxHeight':
                    configManager.inputTextBoxHeight = message.height;
                    break;
                case 'toggleFileType':
                    // Update your extension state based on the received fileType
                    const fileType = message.fileType;
                    const fileTypes = configManager.fileTypes;
                    const index = fileTypes.indexOf(fileType);
                    if (index > -1) {
                        fileTypes.splice(index, 1);
                    } else {
                        fileTypes.push(fileType);
                    }
                    configManager.fileTypes = fileTypes;
        
                    // Then, send an updated fileType list back to the webview
                    if (panel !== null) {
                        panel.webview.postMessage({ command: 'setFileTypes', fileTypes: fileTypes });
                    }
                    break;
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('syntax-extractor.fileTypes')) {
            if (panel !== null) {
                sendFileTypesToWebview(panel);
            }
        }
    });    
    
    let extractFileFolderTreeDisposable = vscode.commands.registerCommand('syntaxExtractor.extractFileFolderTree', extractFileFolderTree);
    context.subscriptions.push(extractFileFolderTreeDisposable);
    let extractAndCopyTextDisposable = vscode.commands.registerCommand('syntaxExtractor.extractAndCopyText', extractAndCopyText);
    context.subscriptions.push(extractAndCopyTextDisposable);
}
function sendFileTypesToWebview(panel: vscode.WebviewPanel) {
    // Always fetch the latest fileTypes from the configuration to ensure synchronization.
    const fileTypes = vscode.workspace.getConfiguration('syntax-extractor').get('fileTypes', []);
    panel.webview.postMessage({
        command: 'setFileTypes',
        fileTypes: fileTypes,
    });
}
function setupClipboardPolling(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    let isDisposed = false;
    panel.onDidDispose(() => {
        isDisposed = true;
    }, null, context.subscriptions);
    const intervalId = setInterval(async () => {
        if (isDisposed) {
            clearInterval(intervalId);
            return;
        }
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
    return intervalId;
}
class MyDataProvider implements vscode.TreeDataProvider<string> {
    getTreeItem(element: string): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return { label: 'SE: Settings', command: { command: 'syntaxExtractor.openGui', title: 'SE: Settings' } };
    }
    getChildren(): vscode.ProviderResult<string[]> {
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