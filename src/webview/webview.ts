declare const acquireVsCodeApi: any;

if (document) {
    console.log('Document loaded');  // add this line
    document.getElementById('openWebpageButton')?.addEventListener('click', () => {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'openWebpage' });
    });
}