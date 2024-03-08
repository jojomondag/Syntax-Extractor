import './webview.css';

declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

// Utility function to send messages to VS Code
function postVsCodeMessage(command: string, data: any = {}) {
    vscode.postMessage({ command, ...data });
}

function on(element: Element | Document, event: string, selector: string, handler: (event: Event) => void) {
    element.addEventListener(event, (e) => {
        if (!selector || (e.target as Element).matches(selector)) {
            handler(e);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupCompressionButtons();
    setupOpenWebpageButton();
    setupTextInput();
    setupWindowMessageListener();
    setupFileTypeInput();
});

function setupCompressionButtons() {
    on(document, 'click', '.compression-button', (event) => {
        const target = event.target as HTMLElement;
        const compressionLevel = target.dataset.level;
        resetButtonColors();
        target.classList.add('selected');
        postVsCodeMessage('setCompressionLevel', { level: compressionLevel });
    });
}

function resetButtonColors() {
    document.querySelectorAll('.compression-button').forEach(button => button.classList.remove('selected'));
}

function setupOpenWebpageButton() {
    on(document, 'click', '#openWebpageButton', () => postVsCodeMessage('openWebpage'));
}

function setupTextInput() {
    const textarea = document.getElementById('textInput') as HTMLTextAreaElement;
    if (textarea) {
        on(textarea, 'input', '', () => {
            postVsCodeMessage('countTokens', { text: textarea.value });
            postVsCodeMessage('countChars', { text: textarea.value });
        });

        new ResizeObserver(() => postVsCodeMessage('updateInputBoxHeight', { height: window.getComputedStyle(textarea).height })).observe(textarea);
    }
}

function setupWindowMessageListener() {
    window.addEventListener('message', ({ data }) => {
        const handlers: { [key: string]: () => void } = {
            setClipboardContent: () => (document.getElementById('textInput') as HTMLTextAreaElement).value = data.content,
            setTokenCount: () => (document.getElementById('tokenCount') as HTMLInputElement).value = data.count.toString(),
            setCharCount: () => (document.getElementById('charCount') as HTMLInputElement).value = data.count.toString(),
            setFileTypes: () => updateFileTypeList(data.fileTypes),
        };

        if (handlers[data.command]) {
            handlers[data.command]();
        }
    });
}

function updateFileTypeList(fileTypes: string[]) {
    const container = document.getElementById('file-types-container');
    if (container) {
        container.innerHTML = fileTypes.map(fileType => `<li>${fileType}</li>`).join('');
    }
}

function setupFileTypeInput() {
    const fileTypeInput = document.getElementById('fileTypeInput') as HTMLInputElement;
    fileTypeInput?.addEventListener('keypress', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            const fileType = fileTypeInput.value.trim();
            if (fileType) {
                vscode.postMessage({
                    command: 'toggleFileType',
                    fileType: fileType
                });
                fileTypeInput.value = '';
            }
            event.preventDefault();
        }
    });
}