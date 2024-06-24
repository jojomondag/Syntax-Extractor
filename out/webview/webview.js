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
    const svgIcon1 = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>`;
    const svgIcon2 = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>`;
    document.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragover', (event) => {
            if (event instanceof DragEvent) {
                handleDragOver(event);
            }
        });
        row.addEventListener('drop', (event) => {
            if (event instanceof DragEvent) {
                handleDrop(event);
            }
        });
    });
    function createBox(fileType) {
        const box = document.createElement('div');
        box.className = 'box';
        box.draggable = true;
        box.innerHTML = `<span class="icon">${fileType.startsWith('.') ? svgIcon1 : svgIcon2}</span> ${fileType}`;
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
    }
    function handleDragOver(event) {
        event.preventDefault();
        const target = event.target.closest('.box');
        if (target && target !== draggedElement) {
            const bounding = target.getBoundingClientRect();
            const offset = bounding.y + bounding.height / 2;
            if (event.clientY - offset > 0) {
                target.parentNode.insertBefore(placeholder, target.nextSibling);
            }
            else {
                target.parentNode.insertBefore(placeholder, target);
            }
        }
    }
    function handleDragEnd() {
        if (draggedElement) {
            draggedElement.style.opacity = '';
        }
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        draggedElement = null;
    }
    function handleDrop(event) {
        event.preventDefault();
        if (draggedElement && placeholder.parentNode) {
            placeholder.parentNode.replaceChild(draggedElement, placeholder);
            draggedElement.style.opacity = '';
        }
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        draggedElement = null;
        updateFileTypes();
    }
    function handleClick(event) {
        const box = event.target.closest('.box');
        if (box) {
            moveBox(box);
        }
    }
    function moveBox(box) {
        const row1 = document.getElementById('row1');
        const row2 = document.getElementById('row2');
        const currentRow = box.parentNode;
        const targetRow = currentRow === row1 ? row2 : row1;
        // Store the original position
        const rect = box.getBoundingClientRect();
        // Create a clone for the animation
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
        // Move the original box immediately
        targetRow.appendChild(box);
        // Force a reflow
        void clone.offsetWidth;
        // Calculate the new position
        const newRect = box.getBoundingClientRect();
        // Animate the clone to the new position
        clone.style.left = `${newRect.left}px`;
        clone.style.top = `${newRect.top}px`;
        // Update visual state
        if (targetRow === row2) {
            clone.style.opacity = '0.5';
            box.style.opacity = '0.5';
        }
        else {
            clone.style.opacity = '1';
            box.style.opacity = '1';
        }
        // Remove the clone after animation
        setTimeout(() => {
            document.body.removeChild(clone);
        }, 500);
        // Update file types after moving the box
        updateFileTypes();
    }
    return { createBox, updateFileTypes };
}
function updateFileTypes() {
    const activeFileTypes = Array.from(document.getElementById('row1').children)
        .map(box => box.textContent.trim())
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    const ignoredFileTypes = Array.from(document.getElementById('row2').children)
        .map(box => box.textContent.trim())
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
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
        fileTypeInput.placeholder = 'Enter file extension or write refresh. Press Enter.';
    });
    fileTypeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            const inputElement = event.target;
            const fileType = inputElement.value.trim();
            if (fileType.toLowerCase() === 'refresh') {
                vscode.postMessage({
                    command: 'refreshFileTypes'
                });
            }
            else if (fileType) {
                const row1 = document.getElementById('row1');
                const row2 = document.getElementById('row2');
                // Check if the file type already exists in either row
                const existingInRow1 = Array.from(row1.children).some(box => box.textContent.trim() === fileType);
                const existingInRow2 = Array.from(row2.children).some(box => box.textContent.trim() === fileType);
                if (!existingInRow1 && !existingInRow2) {
                    const { createBox } = initializeDragAndDrop();
                    const newBox = createBox(fileType);
                    row1.appendChild(newBox);
                    updateFileTypes();
                }
                else {
                    // Optionally, show an error message to the user
                    vscode.postMessage({
                        command: 'showErrorMessage',
                        message: `File type "${fileType}" already exists.`
                    });
                }
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
//# sourceMappingURL=webview.js.map