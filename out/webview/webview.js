"use strict";
const vscode = acquireVsCodeApi();
// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'initConfig':
        case 'configUpdated':
            updateUI(message.fileTypes, message.fileTypesToIgnore, message.compressionLevel, message.clipboardDataBoxHeight);
            break;
        case 'updateClipboardDataBox':
            const clipboardDataBox = document.getElementById('clipboardDataBox');
            if (clipboardDataBox) {
                clipboardDataBox.value = message.content;
                vscode.postMessage({
                    command: 'requestCounts',
                    text: message.content
                });
            }
            break;
        case 'setTokenCount':
            const tokenCountElement = document.getElementById('tokenCount');
            if (tokenCountElement) {
                tokenCountElement.value = message.count.toString();
            }
            break;
        case 'setCharCount':
            const charCountElement = document.getElementById('charCount');
            if (charCountElement) {
                charCountElement.value = message.count.toString();
            }
            break;
        case 'updateFileTypes':
            updateFileTypeBoxes(message.fileTypes, message.fileTypesToIgnore);
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
    initializeDragAndDrop();
    document.getElementById('openWebpageButton')?.addEventListener('click', openWebpageButton);
    document.getElementById('compressionLevelHard')?.addEventListener('click', () => updateCompressionLevel(3));
    document.getElementById('compressionLevelMedium')?.addEventListener('click', () => updateCompressionLevel(2));
    document.getElementById('compressionLevelLight')?.addEventListener('click', () => updateCompressionLevel(1));
});
function initializeDragAndDrop() {
    let draggedElement = null;
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    document.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragover', (event) => {
            handleDragOver(event);
        });
        row.addEventListener('drop', (event) => {
            handleDrop(event);
        });
    });
    function createBox(fileType) {
        const box = document.createElement('div');
        box.className = 'box';
        box.draggable = true;
        const iconSpan = document.createElement('span');
        iconSpan.className = `icon ${fileType.startsWith('.') ? 'icon-file' : 'icon-folder'}`;
        box.appendChild(iconSpan);
        box.appendChild(document.createTextNode(fileType));
        box.addEventListener('dragstart', handleDragStart);
        box.addEventListener('dragend', handleDragEnd);
        box.addEventListener('click', handleClick);
        return box;
    }
    function handleDragStart(event) {
        draggedElement = event.target;
        if (draggedElement) {
            draggedElement.style.opacity = '0.5';
            placeholder.style.width = `${draggedElement.offsetWidth}px`;
            placeholder.style.height = `${draggedElement.offsetHeight}px`;
        }
        removePlaceholder();
    }
    function handleDragOver(event) {
        event.preventDefault();
        if (!draggedElement)
            return;
        const row = event.currentTarget;
        const boxes = Array.from(row.querySelectorAll('.box'));
        let insertBefore = null;
        for (const box of boxes) {
            const rect = box.getBoundingClientRect();
            if (event.clientX < rect.left + rect.width / 2) {
                insertBefore = box;
                break;
            }
        }
        removePlaceholder();
        if (insertBefore) {
            row.insertBefore(placeholder, insertBefore);
        }
        else {
            row.appendChild(placeholder);
        }
    }
    function handleDragEnd(event) {
        if (draggedElement) {
            draggedElement.style.opacity = '';
        }
        removePlaceholder();
        draggedElement = null;
    }
    function handleDrop(event) {
        event.preventDefault();
        if (draggedElement && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(draggedElement, placeholder);
            draggedElement.style.opacity = '';
        }
        removePlaceholder();
        draggedElement = null;
        updateFileTypes();
    }
    function handleClick(event) {
        const box = event.currentTarget;
        if (box) {
            moveBox(box);
        }
    }
    function moveBox(box) {
        const row1 = document.getElementById('row1');
        const row2 = document.getElementById('row2');
        const currentRow = box.parentNode;
        const targetRow = currentRow === row1 ? row2 : row1;
        const rect = box.getBoundingClientRect();
        const clone = box.cloneNode(true);
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
        if (targetRow === row2) {
            clone.style.opacity = '0.5';
            box.style.opacity = '0.5';
        }
        else {
            clone.style.opacity = '1';
            box.style.opacity = '1';
        }
        setTimeout(() => {
            document.body.removeChild(clone);
        }, 500);
        updateFileTypes();
    }
    function removePlaceholder() {
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
    }
    return { createBox, updateFileTypes };
}
function updateFileTypes() {
    const activeFileTypes = Array.from(document.getElementById('row1').children)
        .map(box => box.textContent.trim())
        .filter((value, index, self) => self.indexOf(value) === index);
    const ignoredFileTypes = Array.from(document.getElementById('row2').children)
        .map(box => box.textContent.trim())
        .filter((value, index, self) => self.indexOf(value) === index);
    vscode.postMessage({
        command: 'updateFileTypes',
        activeFileTypes: activeFileTypes,
        ignoredFileTypes: ignoredFileTypes
    });
}
function setupFileTypeInputListener() {
    const fileTypeInput = document.getElementById('fileTypeInput');
    if (!fileTypeInput)
        return;
    fileTypeInput.addEventListener('focus', () => {
        fileTypeInput.placeholder = '';
    });
    fileTypeInput.addEventListener('blur', () => {
        fileTypeInput.placeholder = 'Write Folder/File name to Add/Remove. Press Enter.';
    });
    fileTypeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            const inputElement = event.target;
            const fileType = inputElement.value.trim();
            if (fileType) {
                const row1 = document.getElementById('row1');
                const row2 = document.getElementById('row2');
                const existingInRow1 = Array.from(row1.children).find(box => box.textContent.trim() === fileType);
                const existingInRow2 = Array.from(row2.children).find(box => box.textContent.trim() === fileType);
                if (existingInRow1) {
                    row1.removeChild(existingInRow1);
                }
                else if (existingInRow2) {
                    row2.removeChild(existingInRow2);
                }
                else {
                    const { createBox } = initializeDragAndDrop();
                    const newBox = createBox(fileType);
                    row1.appendChild(newBox);
                }
                updateFileTypes();
            }
            inputElement.value = '';
        }
    });
}
function setupTextInput() {
    const textarea = document.getElementById('clipboardDataBox');
    if (!textarea)
        return;
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
function updateCompressionLevel(level) {
    console.log(`Sending compression level: ${level}`);
    vscode.postMessage({
        command: 'setCompressionLevel',
        level: level
    });
}
function updateUI(fileTypes, fileTypesToIgnore, compressionLevel, clipboardDataBoxHeight) {
    console.log(`Received fileTypes: ${fileTypes}, Ignored Types: ${fileTypesToIgnore}, Compression Level: ${compressionLevel}`);
    document.querySelectorAll('.compression-button').forEach(button => {
        button.classList.remove('selected');
    });
    const levelMap = { 1: 'compressionLevelLight', 2: 'compressionLevelMedium', 3: 'compressionLevelHard' };
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
    updateFileTypeBoxes(fileTypes, fileTypesToIgnore);
}
function updateFileTypeBoxes(fileTypes, fileTypesToIgnore) {
    const row1 = document.getElementById('row1');
    const row2 = document.getElementById('row2');
    row1.innerHTML = '';
    row2.innerHTML = '';
    const { createBox } = initializeDragAndDrop();
    fileTypes.forEach(fileType => {
        const box = createBox(fileType);
        row1.appendChild(box);
    });
    fileTypesToIgnore.forEach(fileType => {
        const box = createBox(fileType);
        box.style.opacity = '0.5';
        row2.appendChild(box);
    });
}
function refreshFileTypes() {
    vscode.postMessage({
        command: 'refreshFileTypes'
    });
}
//# sourceMappingURL=webview.js.map