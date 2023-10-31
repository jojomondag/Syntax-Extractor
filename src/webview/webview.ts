declare const acquireVsCodeApi: any;

const vscode = acquireVsCodeApi();

document.getElementById('openWebpageButton')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'openWebpage' });
});