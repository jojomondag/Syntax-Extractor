import { fs, path, vscode } from '.';
import { extractAndCopyText, extractFileFolderTree, getTokenCount } from './operations';
import { handleOpenWebpage } from './commands/openWebpage';
import { configManager } from './config/ConfigManager';
import fileTypesToRead from './config/fileTypesToRead.json';

let lastClipText = '';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "syntaxExtractor" is now active!');
    const treeDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('syntaxExtractorView', treeDataProvider);
    
    let disposable = vscode.commands.registerCommand('syntaxExtractor.openGui', () => {
        const panel = vscode.window.createWebviewPanel('webview', 'Syntax Extractor', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent(context, panel);
        //This sends my config.json to my webview
        sendFileTypesToWebview(panel);
        let clipboardPollingInterval = setupClipboardPolling(panel, context);
        panel.onDidDispose(() => {
            clearInterval(clipboardPollingInterval);
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
                    panel.webview.postMessage({ command: 'setTokenCount', count: tokenCount });
                    break;
                case 'countChars':
                    const charCount = message.text.length;
                    panel.webview.postMessage({ command: 'setCharCount', count: charCount });
                    break;
                case 'updateInputBoxHeight':
                    configManager.inputTextBoxHeight = message.height;
                    break;
                case 'toggleFileType':
                    toggleFileType(panel, message.fileType);
                    // Optionally, send the updated list back to the webview
                    sendFileTypesToWebview(panel);
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
function sendFileTypesToWebview(panel: vscode.WebviewPanel) {
    fs.readFile(path.join(__dirname, 'config', 'fileTypesToRead.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Failed to read file types:', err);
            return;
        }
        const config = JSON.parse(data);
        panel.webview.postMessage({
            command: 'setFileTypes',
            fileTypes: config.textExtensions, 
        });
    });
}
// Adjusted to return a boolean indicating success
async function toggleFileTypeOperation(fileType: string): Promise<boolean> {
    const fileTypesPath = path.join(__dirname, 'config', 'fileTypesToRead.json');
    fileType = fileType.toLowerCase(); // Normalize fileType for consistent comparison

    try {
        const data = await fs.promises.readFile(fileTypesPath, 'utf8');
        const config = JSON.parse(data);
        const index = config.textExtensions.indexOf(fileType);

        if (index > -1) {
            config.textExtensions.splice(index, 1);
        } else {
            config.textExtensions.push(fileType);
        }

        await fs.promises.writeFile(fileTypesPath, JSON.stringify(config, null, 4), 'utf8');
        return true; // Operation succeeded
    } catch (err) {
        console.error(`Failed to toggle file type ${fileType}:`, err);
        return false; // Operation failed
    }
}

// Modify how operations are added to the queue
function toggleFileType(panel: vscode.WebviewPanel, fileType: string) {
    fileOperationQueue.addToQueue(() => toggleFileTypeOperation(fileType).then(success => {
        if (success) {
            // If the toggle was successful, then refresh the webview
            sendFileTypesToWebview(panel);
        }
    }));
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
class OperationQueue {
    private queue: Promise<void>; // Define the queue property

    constructor() {
        this.queue = Promise.resolve(); // Initial promise chain
    }

    addToQueue(operation: () => Promise<void>) { // Provide a type for the operation parameter
        this.queue = this.queue.then(() => operation());
    }
}

const fileOperationQueue = new OperationQueue();