import './webview.css';

declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

function resetButtonColors() {
    const buttons = document.querySelectorAll('.compression-button');
    buttons.forEach(button => {
        button.classList.remove('selected');
    });
}

const compressionLevelHardButton = document.getElementById('compressionLevelHard');
if (compressionLevelHardButton) {
    compressionLevelHardButton.addEventListener('click', () => {
        resetButtonColors();
        compressionLevelHardButton.classList.add('selected');
        vscode.postMessage({ command: 'setCompressionLevel', level: 'hard' });
    });
}

const compressionLevelMediumButton = document.getElementById('compressionLevelMedium');
if (compressionLevelMediumButton) {
    compressionLevelMediumButton.addEventListener('click', () => {
        resetButtonColors();
        compressionLevelMediumButton.classList.add('selected');
        vscode.postMessage({ command: 'setCompressionLevel', level: 'medium' });
    });
}

const compressionLevelLightButton = document.getElementById('compressionLevelLight');
if (compressionLevelLightButton) {
    compressionLevelLightButton.addEventListener('click', () => {
        resetButtonColors();
        compressionLevelLightButton.classList.add('selected');
        vscode.postMessage({ command: 'setCompressionLevel', level: 'light' });
    });
}

const openWebpageButton = document.getElementById('openWebpageButton');
if (openWebpageButton) {
    openWebpageButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'openWebpage' });
    });
}

const textarea = document.getElementById('textInput');

if (textarea) {
    const resizeObserver = new ResizeObserver(() => {
        const height = window.getComputedStyle(textarea).height;
        vscode.postMessage({
            command: 'updateInputBoxHeight',
            height: height
        });
    });

    resizeObserver.observe(textarea);
}

// New code for receiving clipboard content and setting it in the textarea
window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'setClipboardContent') {
        const textInput = document.getElementById('textInput') as HTMLTextAreaElement; // Cast to specific type
        if (textInput) {
            textInput.value = message.content;
        }
    }
});