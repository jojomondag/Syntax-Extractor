declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

import './webview.css';

// BoxManager Module
const BoxManager = (() => {
    class BoxManager {
        private draggedElement: HTMLElement | null = null;
        private placeholder: HTMLDivElement;
        private row1: HTMLElement;
        private row2: HTMLElement;

        constructor() {
            this.placeholder = document.createElement('div');
            this.placeholder.className = 'placeholder';
            this.row1 = document.getElementById('row1')!;
            this.row2 = document.getElementById('row2')!;

            this.initializeRows();
        }

        private initializeRows() {
            [this.row1, this.row2].forEach(row => {
                row.addEventListener('dragover', this.handleDragOver.bind(this));
                row.addEventListener('drop', this.handleDrop.bind(this));
            });
        }

        public createBox(fileType: string): HTMLDivElement {
            const box = document.createElement('div');
            box.className = 'box';
            box.draggable = true;
            
            const iconSpan = document.createElement('span');
            iconSpan.className = `icon ${fileType.startsWith('.') ? 'icon-file' : 'icon-folder'}`;
        
            const eyeIcon = document.createElement('span');
            eyeIcon.className = 'eye-icon';
        
            box.appendChild(iconSpan);
            box.appendChild(document.createTextNode(fileType));
            box.appendChild(eyeIcon);
        
            box.addEventListener('dragstart', this.handleDragStart.bind(this));
            box.addEventListener('dragend', this.handleDragEnd.bind(this));
            box.addEventListener('click', this.handleClick.bind(this));
            return box;
        }

        private handleDragStart(event: DragEvent) {
            this.draggedElement = event.target as HTMLElement;
            if (this.draggedElement) {
                this.draggedElement.style.opacity = '0.5';
                this.placeholder.style.width = `${this.draggedElement.offsetWidth}px`;
                this.placeholder.style.height = `${this.draggedElement.offsetHeight}px`;
            }
            this.removePlaceholder();
        }

        private handleDragOver(event: DragEvent) {
            event.preventDefault();
            if (!this.draggedElement) return;

            const row = event.currentTarget as HTMLElement;
            const boxes = Array.from(row.querySelectorAll('.box')) as HTMLElement[];
            
            let insertBefore: HTMLElement | null = null;
            for (const box of boxes) {
                const rect = box.getBoundingClientRect();
                if (event.clientX < rect.left + rect.width / 2) {
                    insertBefore = box;
                    break;
                }
            }

            this.removePlaceholder();

            if (insertBefore) {
                row.insertBefore(this.placeholder, insertBefore);
            } else {
                row.appendChild(this.placeholder);
            }
        }

        private handleDragEnd(event: DragEvent) {
            if (this.draggedElement) {
                this.draggedElement.style.opacity = '';
            }
            this.removePlaceholder();
            this.draggedElement = null;
        }

        private handleDrop(event: DragEvent) {
            event.preventDefault();
            if (this.draggedElement && this.placeholder.parentNode) {
                this.placeholder.parentNode.insertBefore(this.draggedElement, this.placeholder);
                this.draggedElement.style.opacity = '';
            }
            this.removePlaceholder();
            this.draggedElement = null;
            this.updateFileTypes();
        }

        private handleClick(event: MouseEvent) {
            const box = event.currentTarget as HTMLElement;
            if (box) {
                this.moveBox(box);
            }
        }
        
        private moveBox(box: HTMLElement) {
            const currentRow = box.parentNode as HTMLElement;
            const targetRow = currentRow === this.row1 ? this.row2 : this.row1;
        
            const rect = box.getBoundingClientRect();
        
            const clone = box.cloneNode(true) as HTMLElement;
            clone.style.position = 'fixed';
            clone.style.left = `${rect.left}px`;
            clone.style.top = `${rect.top}px`;
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.margin = '0';
            clone.style.transition = 'all 0.5s ease-in-out';
            clone.style.zIndex = '1000';
            document.body.appendChild(clone);
        
            targetRow.appendChild(box);
        
            void clone.offsetWidth;
        
            const newRect = box.getBoundingClientRect();
        
            clone.style.left = `${newRect.left}px`;
            clone.style.top = `${newRect.top}px`;
        
            if (targetRow === this.row2) {
                clone.style.opacity = '0.5';
                box.style.opacity = '0.5';
                box.querySelector('.eye-icon')!.classList.add('visible');
            } else {
                clone.style.opacity = '1';
                box.style.opacity = '1';
                box.querySelector('.eye-icon')!.classList.remove('visible');
            }
        
            setTimeout(() => {
                document.body.removeChild(clone);
            }, 500);
        
            this.updateFileTypes();
        }

        private removePlaceholder() {
            if (this.placeholder.parentNode) {
                this.placeholder.parentNode.removeChild(this.placeholder);
            }
        }

        public updateFileTypes() {
            const activeFileTypes = Array.from(this.row1.children)
                .map(box => (box as HTMLElement).textContent!.trim())
                .filter((value, index, self) => self.indexOf(value) === index);

            const ignoredFileTypes = Array.from(this.row2.children)
                .map(box => (box as HTMLElement).textContent!.trim())
                .filter((value, index, self) => self.indexOf(value) === index);

            vscode.postMessage({
                command: 'updateFileTypes',
                activeFileTypes: activeFileTypes,
                ignoredFileTypes: ignoredFileTypes
            });
        }

        public updateFileTypeBoxes(fileTypes: string[], fileTypesToIgnore: string[]) {
            this.row1.innerHTML = '';
            this.row2.innerHTML = '';

            fileTypes.forEach(fileType => {
                const box = this.createBox(fileType);
                this.row1.appendChild(box);
            });

            fileTypesToIgnore.forEach(fileType => {
                const box = this.createBox(fileType);
                box.style.opacity = '0.5';
                box.querySelector('.eye-icon')!.classList.add('visible');
                this.row2.appendChild(box);
            });
        }
    }

    return new BoxManager();
})();

// Rest of the webview.ts file remains the same
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
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
            BoxManager.updateFileTypeBoxes(message.fileTypes, message.fileTypesToIgnore);
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
                    const newBox = BoxManager.createBox(fileType);
                    row1.appendChild(newBox);
                }

                BoxManager.updateFileTypes();
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

    BoxManager.updateFileTypeBoxes(fileTypes, fileTypesToIgnore);
}

function refreshFileTypes() {
    vscode.postMessage({
        command: 'refreshFileTypes'
    });
}