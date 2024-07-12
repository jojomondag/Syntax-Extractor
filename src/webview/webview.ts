declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

import './webview.css';
import BoxManager from './boxManager';

const boxManager = new BoxManager(vscode);

// Rest of the webview.ts file remains the same
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        // updateUI, updateFileTypes, etc. should now use `boxManager` instead of `BoxManager`
        case 'initConfig':
        case 'configUpdated':
            updateUI(message.fileTypes, message.fileTypesToIgnore, message.compressionLevel, message.clipboardDataBoxHeight);
            break;
        case 'updateClipboardDataBox':
            const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
            if (clipboardDataBox) {
                clipboardDataBox.value = message.content;
                vscode.postMessage({
                    command: 'requestCounts',
                    text: message.content
                });
            }
            break;
        case 'setTokenCount':
            const tokenCountElement = document.getElementById('tokenCount') as HTMLInputElement;
            if (tokenCountElement) {
                tokenCountElement.value = message.count.toString();
            }
            break;
        case 'setCharCount':
            const charCountElement = document.getElementById('charCount') as HTMLInputElement;
            if (charCountElement) {
                charCountElement.value = message.count.toString();
            }
            break;
        case 'updateFileTypes':
            boxManager.updateFileTypeBoxes(message.fileTypes, message.fileTypesToIgnore);
            break;
        case 'refreshComplete':
            vscode.postMessage({ command: 'showInformationMessage', text: 'File types have been refreshed.' });
            break;
    }
});

// Initialize event listeners after DOM load
document.addEventListener('DOMContentLoaded', () => {
    setClipboardDataBoxHeight();
    setupTextInput();
    setupFileTypeInputListener();

    document.getElementById('openWebpageButton')?.addEventListener('click', openWebpageButton);
    document.getElementById('compressionLevelHard')?.addEventListener('click', () => updateCompressionLevel(3));
    document.getElementById('compressionLevelMedium')?.addEventListener('click', () => updateCompressionLevel(2));
    document.getElementById('compressionLevelLight')?.addEventListener('click', () => updateCompressionLevel(1));
});

function setupFileTypeInputListener() {
    const fileTypeInput = document.getElementById('fileTypeInput') as HTMLInputElement;
    if (!fileTypeInput) return;

    fileTypeInput.addEventListener('focus', () => {
        fileTypeInput.placeholder = '';
    });

    fileTypeInput.addEventListener('blur', () => {
        fileTypeInput.placeholder = 'Write Folder/File name to Add/Remove. Press Enter.';
    });

    fileTypeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            const inputElement = event.target as HTMLInputElement;
            const fileType = inputElement.value.trim();

            if (fileType) {
                const row1 = document.getElementById('row1')!;
                const row2 = document.getElementById('row2')!;
                
                const existingInRow1 = Array.from(row1.children).find(box => (box as HTMLElement).textContent!.trim() === fileType) as HTMLElement | undefined;
                const existingInRow2 = Array.from(row2.children).find(box => (box as HTMLElement).textContent!.trim() === fileType) as HTMLElement | undefined;

                if (existingInRow1) {
                    row1.removeChild(existingInRow1);
                } else if (existingInRow2) {
                    row2.removeChild(existingInRow2);
                } else {
                    const newBox = boxManager.createBox(fileType);
                    row1.appendChild(newBox);
                }

                boxManager.updateFileTypes();
            }
            inputElement.value = '';
        }
    });
}

function setupTextInput() {
    const textarea = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (!textarea) return;

    textarea.addEventListener('input', () => {
        vscode.postMessage({
            command: 'countTokens',
            text: textarea.value
        });
        vscode.postMessage({
            command: 'countChars',
            text: textarea.value
        });
    });
}

function openWebpageButton() {
    vscode.postMessage({
        command: 'openWebpage'
    });
}

function setClipboardDataBoxHeight() {
    const clipboardDataBox = document.getElementById('clipboardDataBox');

    document.addEventListener('mouseup', () => {
        if (clipboardDataBox) {
            const height = clipboardDataBox.offsetHeight;
            vscode.postMessage({
                command: 'setClipboardDataBoxHeight',
                height: height
            });
        }
    });
}

function updateCompressionLevel(level: number) {
    console.log(`Sending compression level: ${level}`);
    vscode.postMessage({
        command: 'setCompressionLevel',
        level: level
    });
}

function updateUI(fileTypes: string[], fileTypesToIgnore: string[], compressionLevel: number, clipboardDataBoxHeight?: number) {
    console.log(`Received fileTypes: ${fileTypes}, Ignored Types: ${fileTypesToIgnore}, Compression Level: ${compressionLevel}`);

    document.querySelectorAll('.compression-button').forEach(button => {
        button.classList.remove('selected');
    });

    const levelMap: { [key: number]: string } = {1: 'compressionLevelLight', 2: 'compressionLevelMedium', 3: 'compressionLevelHard'};
    const selectedButtonId = levelMap[compressionLevel];
    const selectedButton = document.getElementById(selectedButtonId);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }

    if (clipboardDataBoxHeight !== undefined) {
        const clipboardDataBox = document.getElementById('clipboardDataBox');
        if (clipboardDataBox) {
            clipboardDataBox.style.height = `${clipboardDataBoxHeight}px`;
        }
    }

    boxManager.updateFileTypeBoxes(fileTypes, fileTypesToIgnore);
}

function refreshFileTypes() {
    vscode.postMessage({
        command: 'refreshFileTypes'
    });
}
