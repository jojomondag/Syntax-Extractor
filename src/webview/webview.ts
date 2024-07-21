import './styles/webview.css';
import { Box } from './components/Box';

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();
let draggedElement: HTMLElement | null = null;
const placeholder = document.createElement('div');
placeholder.className = 'placeholder';
const clickAndHoldDuration = 200;
let clickTimeout: number | undefined;
let isClickAndHold = false;
let garbageIcon: HTMLElement | null = null;
let isDragging = false;
let initialCursorX = 0;
let lastPlaceholderPosition: HTMLElement | null = null;
const moveThreshold = 10; // Adjust this value as needed

type Message = {
    command: string;
    compressionLevel?: number;
    clipboardDataBoxHeight?: number;
    content?: string;
    count?: number;
    fileTypes?: string[];
    fileTypesToIgnore?: string[];
    hideFoldersAndFiles?: string[];
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    setClipboardDataBoxHeight();
    setupTextInput();
    setupCompressionButtons();
    setupOpenWebpageButton();
    setupDragAndDrop();
    setupGarbageIcon();
    requestFileTypes();
    requestHiddenFoldersAndFiles();
});

window.addEventListener('message', (event: MessageEvent<Message>) => {
    const message = event.data;
    console.log('Received message:', message);
    switch (message.command) {
        case 'initConfig':
        case 'configUpdated':
            if (message.compressionLevel !== undefined) {
                updateUI(message.compressionLevel, message.clipboardDataBoxHeight);
            }
            break;
        case 'updateFileTypes':
            console.log("Received file types in webview:", message.fileTypes);
            console.log("Received ignored file types in webview:", message.fileTypesToIgnore);
            if (Array.isArray(message.fileTypes) && Array.isArray(message.fileTypesToIgnore)) {
                createBoxesFromFileTypes(message.fileTypes, message.fileTypesToIgnore);
            }
            break;
        case 'updateHideFoldersAndFiles':
            if (Array.isArray(message.hideFoldersAndFiles)) {
                updateHiddenBoxes(message.hideFoldersAndFiles);
            }
            break;
        case 'updateClipboardDataBox':
            updateClipboardDataBox(message.content);
            break;
        case 'setTokenCount':
            updateTokenCount(message.count);
            break;
        case 'setCharCount':
            updateCharCount(message.count);
            break;
    }
});

function updateHiddenBoxes(hiddenItems: string[]) {
    const row2 = document.getElementById('row2');
    if (!row2) return;

    row2.querySelectorAll('.box').forEach((box: Element) => {
        const textElement = box.querySelector('.text');
        const blueRegion = box.querySelector('.right-icon') as HTMLElement;
        if (textElement && blueRegion) {
            const itemValue = textElement.textContent || '';
            if (hiddenItems.includes(itemValue)) {
                blueRegion.classList.remove('open-eye');
                blueRegion.classList.add('closed-eye');
                (box as HTMLElement).classList.add('hidden');
                (box as HTMLElement).style.opacity = '0.5';
            } else {
                blueRegion.classList.remove('closed-eye');
                blueRegion.classList.add('open-eye');
                (box as HTMLElement).classList.remove('hidden');
                (box as HTMLElement).style.opacity = '1';
            }
        }
    });
}

function setupTextInput() {
    const textarea = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (!textarea) {
        console.error('Clipboard data box not found');
        return;
    }

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

function setupCompressionButtons() {
    document.getElementById('compressionLevelHard')?.addEventListener('click', () => updateCompressionLevel(3));
    document.getElementById('compressionLevelMedium')?.addEventListener('click', () => updateCompressionLevel(2));
    document.getElementById('compressionLevelLight')?.addEventListener('click', () => updateCompressionLevel(1));
}

function setupOpenWebpageButton() {
    document.getElementById('openWebpageButton')?.addEventListener('click', () => {
        vscode.postMessage({
            command: 'openWebpage'
        });
    });
}

function createBoxesFromFileTypes(fileTypes: string[], fileTypesToIgnore: string[]) {
    console.log("Creating boxes for file types:", fileTypes);
    console.log("Creating boxes for ignored file types:", fileTypesToIgnore);
    const row1 = document.getElementById('row1');
    const row2 = document.getElementById('row2');
    if (!row1 || !row2) {
        console.error("Row elements not found");
        return;
    }

    row1.innerHTML = '';
    row2.innerHTML = '';

    const template = document.getElementById('box-template') as HTMLTemplateElement;
    if (!template) {
        console.error("Box template not found");
        return;
    }

    const createBox = (item: string, row: HTMLElement) => {
        try {
            const box = new Box(template, item);
            const boxElement = box.getElement();

            const iconElement = boxElement.querySelector('.left-icon') as HTMLElement;
            if (iconElement) {
                iconElement.classList.add(item.startsWith('.') ? 'icon-file' : 'icon-folder');
            }

            row.appendChild(boxElement);
            box.updateBoxStyles();

            // Store the Box instance on the DOM element for easy retrieval
            (boxElement as any).__box_instance = box;

            // Set initial visibility state for row2 boxes
            if (row.id === 'row2') {
                const hiddenItems = getHiddenItems();
                const isHidden = hiddenItems.includes(item);
                box.setVisibility(!isHidden);
            }
        } catch (error) {
            console.error(`Error creating box for ${item}:`, error);
        }
    };

    fileTypes.forEach(item => createBox(item, row1));
    fileTypesToIgnore.forEach(item => createBox(item, row2));
}

function getHiddenItems(): string[] {
    return JSON.parse(localStorage.getItem('hiddenItems') || '[]');
}

function setHiddenItems(items: string[]) {
    localStorage.setItem('hiddenItems', JSON.stringify(items));
}

function setClipboardDataBoxHeight() {
    const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (!clipboardDataBox) {
        console.error('Clipboard data box not found');
        return;
    }

    document.addEventListener('mouseup', () => {
        const height = clipboardDataBox.offsetHeight;
        vscode.postMessage({
            command: 'setClipboardDataBoxHeight',
            height: height
        });
    });
}

function updateCompressionLevel(level: number) {
    console.log(`Sending compression level: ${level}`);
    vscode.postMessage({
        command: 'setCompressionLevel',
        level: level
    });
}

function updateUI(compressionLevel: number, clipboardDataBoxHeight?: number) {
    console.log(`Received Compression Level: ${compressionLevel}`);

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
        const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
        if (clipboardDataBox) {
            clipboardDataBox.style.height = `${clipboardDataBoxHeight}px`;
        }
    }
}

function setupDragAndDrop() {
    document.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragover', (event) => handleDragOver(event as DragEvent));
        row.addEventListener('drop', (event) => handleDrop(event as DragEvent));
    });

    document.addEventListener('mousedown', handleBehavior);
    document.addEventListener('mouseup', handleBehavior);
    document.addEventListener('click', handleBehavior);
}

function setupGarbageIcon() {
    garbageIcon = document.querySelector('.garbage-icon');
    if (!garbageIcon) {
        console.error('Garbage icon not found');
        return;
    }

    garbageIcon.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (isDragging && garbageIcon) {
            garbageIcon.style.backgroundImage = 'var(--icon-garbage-open)';
        }
    });

    garbageIcon.addEventListener('dragleave', () => {
        if (garbageIcon) {
            garbageIcon.style.backgroundImage = 'var(--icon-garbage)';
        }
    });

    garbageIcon.addEventListener('drop', (event) => {
        event.preventDefault();
        if (garbageIcon) {
            garbageIcon.style.backgroundImage = 'var(--icon-garbage)';
        }
        if (draggedElement) {
            removeBox(draggedElement);
            draggedElement = null;
        }
        isDragging = false;
        document.body.removeAttribute('data-dragging');
    });
}

function handleBehavior(event: MouseEvent) {
    const box = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (!box) return;

    if ((event.target as HTMLElement).closest('.right-icon')) {
        return;
    }

    switch (event.type) {
        case 'mousedown':
            isClickAndHold = false;
            clickTimeout = window.setTimeout(() => {
                isClickAndHold = true;
                handleDragStart(event as unknown as DragEvent);
            }, clickAndHoldDuration);
            break;
        case 'mouseup':
            clearTimeout(clickTimeout);
            if (isClickAndHold) {
                handleDragEnd(event as unknown as DragEvent);
            }
            break;
        case 'click':
            clearTimeout(clickTimeout);
            if (!isClickAndHold) {
                moveBox(box);
            }
            break;
    }
}

function handleDragStart(event: DragEvent) {
    draggedElement = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (draggedElement) {
        isDragging = true;
        document.body.setAttribute('data-dragging', 'true');
        placeholder.style.width = `${draggedElement.offsetWidth}px`;
        placeholder.style.height = `${draggedElement.offsetHeight}px`;

        initialCursorX = event.clientX; // Track initial cursor position

        if (event.dataTransfer) {
            const dragImage = draggedElement.cloneNode(true) as HTMLElement;
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.style.opacity = '1';
            dragImage.style.pointerEvents = 'none';
            document.body.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 0, 0);
        }
    }
}

function handleDragOver(event: DragEvent) {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest('.box') as HTMLElement;

    // Only show placeholder if the cursor has moved the threshold distance
    if (Math.abs(event.clientX - initialCursorX) > moveThreshold) {
        if (target && target !== draggedElement && target !== lastPlaceholderPosition) {
            const bounding = target.getBoundingClientRect();
            const offset = bounding.y + bounding.height / 2;
            if (event.clientY - offset > 0) {
                target.parentNode!.insertBefore(placeholder, target.nextSibling);
            } else {
                target.parentNode!.insertBefore(placeholder, target);
            }
            lastPlaceholderPosition = target;
        }
    }
}

function handleDragEnd(event: DragEvent) {
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    draggedElement = null;
    isDragging = false;
    document.body.removeAttribute('data-dragging');
    isClickAndHold = false;
    lastPlaceholderPosition = null;

    const dragImages = document.querySelectorAll('.box[style*="position: absolute"]');
    dragImages.forEach(img => {
        img.remove();
    });
}

function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(draggedElement, placeholder);
        updateBoxStyles(draggedElement);
        updateFileTypes();
    }
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    draggedElement = null;
    isDragging = false;
    document.body.removeAttribute('data-dragging');
    isClickAndHold = false;
    lastPlaceholderPosition = null;
}

function moveBox(box: HTMLElement) {
    const row1 = document.getElementById('row1') as HTMLElement;
    const row2 = document.getElementById('row2') as HTMLElement;
    const currentRow = box.parentNode as HTMLElement;
    const targetRow = currentRow.id === 'row1' ? row2 : row1;

    const rect = box.getBoundingClientRect();
    targetRow.appendChild(box);
    const newRect = box.getBoundingClientRect();

    const deltaX = rect.left - newRect.left;
    const deltaY = rect.top - newRect.top;

    box.style.transition = 'none';
    box.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    box.offsetWidth; // Force reflow
    box.style.transition = 'transform 0.5s ease-in-out';
    box.style.transform = 'translate(0, 0)';

    if (targetRow.id === 'row1') {
        // Moving from row2 to row1
        box.classList.remove('hidden');
        const blueRegion = box.querySelector('.right-icon');
        if (blueRegion) {
            blueRegion.remove();
        }
        box.style.opacity = '1';
        removeFromIgnoreList(box.querySelector('.text')?.textContent || '');
    } else {
        // Moving from row1 to row2
        if (!box.querySelector('.right-icon')) {
            const blueRegion = document.createElement('span');
            blueRegion.className = 'icon right-icon open-eye';
            blueRegion.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleEyeIcon(blueRegion);
            });
            box.appendChild(blueRegion);
        }
        addToIgnoreList(box.querySelector('.text')?.textContent || '');
    }

    updateBoxStyles(box);
    updateFileTypes();
}

function updateBoxStyles(box: HTMLElement) {
    let blueRegion = box.querySelector('.right-icon') as HTMLElement;
    const textElement = box.querySelector('.text') as HTMLElement;

    if ((box.parentNode as HTMLElement).id === 'row2') {
        if (!blueRegion) {
            blueRegion = document.createElement('span');
            blueRegion.className = 'icon right-icon open-eye';
            blueRegion.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleEyeIcon(blueRegion);
            });
            box.appendChild(blueRegion);
        }
        textElement.style.borderTopRightRadius = "0";
        textElement.style.borderBottomRightRadius = "0";
    } else {
        if (blueRegion) {
            blueRegion.remove();
        }
        textElement.style.borderTopRightRadius = "var(--border-radius)";
        textElement.style.borderBottomRightRadius = "var(--border-radius)";
    }

    updateIconBackground(box);
}

function updateIconBackground(box: HTMLElement) {
    const iconElement = box.querySelector('.icon') as HTMLElement;
    if ((box.parentNode as HTMLElement).id === 'row2' && !iconElement.classList.contains('right-icon')) {
        iconElement.style.backgroundColor = 'var(--icon-bg-color-row2)';
    } else {
        iconElement.style.backgroundColor = 'var(--icon-bg-color)';
    }
}

function toggleEyeIcon(blueRegion: HTMLElement) {
    const box = blueRegion.closest('.box') as HTMLElement;
    if ((box.parentNode as HTMLElement).id !== 'row2') return;

    const textElement = box.querySelector('.text') as HTMLElement;
    const itemValue = textElement.textContent || '';

    if (blueRegion.classList.contains('open-eye')) {
        blueRegion.classList.remove('open-eye');
        blueRegion.classList.add('closed-eye');
        box.classList.add('hidden');
        box.style.opacity = '0.5';
        addToHideFoldersAndFiles(itemValue);
    } else {
        blueRegion.classList.remove('closed-eye');
        blueRegion.classList.add('open-eye');
        box.classList.remove('hidden');
        box.style.opacity = '1';
        removeFromHideFoldersAndFiles(itemValue);
    }
}

function addToIgnoreList(item: string) {
    vscode.postMessage({
        command: 'addToIgnoreList',
        item: item
    });
}

function removeFromIgnoreList(item: string) {
    vscode.postMessage({
        command: 'removeFromIgnoreList',
        item: item
    });
}

function addToHideFoldersAndFiles(item: string) {
    const hiddenItems = getHiddenItems();
    if (!hiddenItems.includes(item)) {
        hiddenItems.push(item);
        setHiddenItems(hiddenItems);
    }
    vscode.postMessage({
        command: 'addToHideFoldersAndFiles',
        item: item
    });
}

function removeFromHideFoldersAndFiles(item: string) {
    const hiddenItems = getHiddenItems();
    const index = hiddenItems.indexOf(item);
    if (index > -1) {
        hiddenItems.splice(index, 1);
        setHiddenItems(hiddenItems);
    }
    vscode.postMessage({
        command: 'removeFromHideFoldersAndFiles',
        item: item
    });
}

function updateFileTypes() {
    const row1 = document.getElementById('row1');
    const row2 = document.getElementById('row2');

    if (!row1 || !row2) {
        console.error('Row elements not found');
        return;
    }

    const activeFileTypes = Array.from(row1.querySelectorAll('.box .text')).map(el => el.textContent || '');
    const ignoredFileTypes = Array.from(row2.querySelectorAll('.box .text')).map(el => el.textContent || '');

    const hiddenStates: { [key: string]: boolean } = {};
    row2.querySelectorAll('.box').forEach((box: Element) => {
        const textElement = box.querySelector('.text');
        const rightIcon = box.querySelector('.right-icon');
        if (textElement && textElement.textContent && rightIcon) {
            hiddenStates[textElement.textContent] = rightIcon.classList.contains('closed-eye');
        }
    });

    vscode.postMessage({
        command: 'updateFileTypes',
        activeFileTypes: activeFileTypes,
        ignoredFileTypes: ignoredFileTypes
    });

    vscode.postMessage({
        command: 'updateHiddenStates',
        hiddenStates: hiddenStates
    });
}

function removeBox(box: HTMLElement) {
    box.remove();
    updateFileTypes();
}

function updateClipboardDataBox(content: string | undefined) {
    const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (clipboardDataBox && content !== undefined) {
        clipboardDataBox.value = content;
        vscode.postMessage({
            command: 'requestCounts',
            text: content
        });
    }
}

function updateTokenCount(count: number | undefined) {
    const tokenCountElement = document.getElementById('tokenCount') as HTMLInputElement;
    if (tokenCountElement && count !== undefined) {
        tokenCountElement.value = count.toString();
    }
}

function updateCharCount(count: number | undefined) {
    const charCountElement = document.getElementById('charCount') as HTMLInputElement;
    if (charCountElement && count !== undefined) {
        charCountElement.value = count.toString();
    }
}

function requestFileTypes() {
    vscode.postMessage({ command: 'getFileTypes' });
}

function requestHiddenFoldersAndFiles() {
    vscode.postMessage({ command: 'getHideFoldersAndFiles' });
}
