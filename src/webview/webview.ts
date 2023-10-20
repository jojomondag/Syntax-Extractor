declare const acquireVsCodeApi: any;

const vscode = acquireVsCodeApi();

document.getElementById('openWebpageButton')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'openWebpage' });
});

document.getElementById('copyHierarchyBtn')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'extractStructure' });
});
