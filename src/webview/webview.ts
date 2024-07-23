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
const moveThreshold = 10;

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

const postMessage = (command: string, payload: object = {}) => {
    vscode.postMessage({ command, ...payload });
};

document.addEventListener('DOMContentLoaded', () => {
    initializeWebview();
    requestFileTypes();
    requestHiddenFoldersAndFiles();
});

window.addEventListener('message', (event: MessageEvent<Message>) => {
    const message = event.data;
    console.log('Received message:', message);
    const handlers: Record<string, () => void> = {
        initConfig: () => updateUI(message.compressionLevel, message.clipboardDataBoxHeight),
        configUpdated: () => updateUI(message.compressionLevel, message.clipboardDataBoxHeight),
        updateFileTypes: () => createBoxes(message.fileTypes, message.fileTypesToIgnore),
        updateHideFoldersAndFiles: () => updateHiddenBoxes(message.hideFoldersAndFiles),
        updateClipboardDataBox: () => updateClipboardContent(message.content),
        setTokenCount: () => updateTokenCount(message.count),
        setCharCount: () => updateCharCount(message.count),
    };
    handlers[message.command]?.();
});

const initializeWebview = () => {
    setClipboardDataBoxHeight();
    setupTextInput();
    setupButtons();
    setupDragAndDrop();
    setupGarbageIcon();
};

const setClipboardDataBoxHeight = () => {
    const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (!clipboardDataBox) return;

    document.addEventListener('mouseup', () => {
        postMessage('setClipboardDataBoxHeight', { height: clipboardDataBox.offsetHeight });
    });
};

const setupTextInput = () => {
    const textarea = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (!textarea) return;

    textarea.addEventListener('input', () => {
        const text = textarea.value;
        postMessage('countTokens', { text });
        postMessage('countChars', { text });
    });
};

const setupButtons = () => {
    const compressionLevels = [
        { id: 'compressionLevelHard', level: 3 },
        { id: 'compressionLevelMedium', level: 2 },
        { id: 'compressionLevelLight', level: 1 },
    ];

    compressionLevels.forEach(({ id, level }) => {
        document.getElementById(id)?.addEventListener('click', () => updateCompressionLevel(level));
    });

    document.getElementById('openWebpageButton')?.addEventListener('click', () => {
        postMessage('openWebpage');
    });
};

const updateCompressionLevel = (level: number) => {
    console.log(`Sending compression level: ${level}`);
    postMessage('setCompressionLevel', { level });
};

const updateUI = (compressionLevel?: number, clipboardDataBoxHeight?: number) => {
    document.querySelectorAll('.compression-button').forEach(button => button.classList.remove('selected'));

    if (compressionLevel !== undefined) {
        const levelMap = ['compressionLevelLight', 'compressionLevelMedium', 'compressionLevelHard'];
        document.getElementById(levelMap[compressionLevel - 1])?.classList.add('selected');
    }

    if (clipboardDataBoxHeight !== undefined) {
        const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
        clipboardDataBox.style.height = `${clipboardDataBoxHeight}px`;
    }
};

const setupDragAndDrop = () => {
    document.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragover', (event) => handleDragOver(event as DragEvent));
        row.addEventListener('drop', (event) => handleDrop(event as DragEvent));
    });

    document.addEventListener('mousedown', handleMouseEvents);
    document.addEventListener('mouseup', handleMouseEvents);
    document.addEventListener('click', handleMouseEvents);
};

const setupGarbageIcon = () => {
    garbageIcon = document.querySelector('.garbage-icon');
    if (!garbageIcon) return;

    garbageIcon.addEventListener('dragover', (event) => handleGarbageEvent(event as DragEvent, 'over'));
    garbageIcon.addEventListener('dragleave', () => handleGarbageEvent(null, 'leave'));
    garbageIcon.addEventListener('drop', (event) => handleGarbageEvent(event as DragEvent, 'drop'));
};

const handleMouseEvents = (event: MouseEvent) => {
    const box = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (!box || (event.target as HTMLElement).closest('.right-icon')) return;

    switch (event.type) {
        case 'mousedown':
            clickTimeout = window.setTimeout(() => {
                isClickAndHold = true;
                handleDragStart(event as unknown as DragEvent);
            }, clickAndHoldDuration);
            break;
        case 'mouseup':
            clearTimeout(clickTimeout);
            if (isClickAndHold) handleDragEnd(event as unknown as DragEvent);
            break;
        case 'click':
            clearTimeout(clickTimeout);
            if (!isClickAndHold) moveBox(box);
            break;
    }
};

const handleDragStart = (event: DragEvent) => {
    draggedElement = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (!draggedElement) return;

    isDragging = true;
    document.body.setAttribute('data-dragging', 'true');
    placeholder.style.width = `${draggedElement.offsetWidth}px`;
    placeholder.style.height = `${draggedElement.offsetHeight}px`;

    initialCursorX = event.clientX;

    if (event.dataTransfer) {
        const dragImage = draggedElement.cloneNode(true) as HTMLElement;
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.opacity = '1';
        dragImage.style.pointerEvents = 'none';
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
    }
};

const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest('.box') as HTMLElement;

    if (Math.abs(event.clientX - initialCursorX) > moveThreshold && target && target !== draggedElement && target !== lastPlaceholderPosition) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        target.parentNode!.insertBefore(placeholder, event.clientY - offset > 0 ? target.nextSibling : target);
        lastPlaceholderPosition = target;
    }
};

const handleDragEnd = (event: DragEvent) => {
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    cleanupDragState();
};

const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(draggedElement, placeholder);
        updateBoxStyles(draggedElement);
        updateFileTypes();
    }
    cleanupDragState();
};

const cleanupDragState = () => {
    draggedElement = null;
    isDragging = false;
    document.body.removeAttribute('data-dragging');
    isClickAndHold = false;
    lastPlaceholderPosition = null;

    document.querySelectorAll('.box[style*="position: absolute"]').forEach(img => img.remove());
};

const handleGarbageEvent = (event: DragEvent | null, action: 'over' | 'leave' | 'drop') => {
    if (!garbageIcon) return;

    switch (action) {
        case 'over':
            event?.preventDefault();
            garbageIcon.style.backgroundImage = 'var(--icon-garbage-open)';
            break;
        case 'leave':
            garbageIcon.style.backgroundImage = 'var(--icon-garbage)';
            break;
        case 'drop':
            event?.preventDefault();
            garbageIcon.style.backgroundImage = 'var(--icon-garbage)';
            if (draggedElement) removeBox(draggedElement);
            cleanupDragState();
            break;
    }
};

const createBoxes = (fileTypes: string[] = [], fileTypesToIgnore: string[] = []) => {
    const rows = { row1: fileTypes, row2: fileTypesToIgnore };
    Object.entries(rows).forEach(([rowId, types]) => {
        const row = document.getElementById(rowId) as HTMLElement;
        if (!row) return;

        row.innerHTML = '';
        const template = document.getElementById('box-template') as HTMLTemplateElement;
        if (!template) return;

        types.forEach(type => {
            try {
                const box = new Box(template, type);
                const boxElement = box.getElement();
                (boxElement.querySelector('.left-icon') as HTMLElement)?.classList.add(type.startsWith('.') ? 'icon-file' : 'icon-folder');
                row.appendChild(boxElement);
                box.updateBoxStyles();
                (boxElement as any).__box_instance = box;

                if (rowId === 'row2') {
                    box.setVisibility(!getHiddenItems().includes(type));
                }
            } catch (error) {
                console.error(`Error creating box for ${type}:`, error);
            }
        });
    });
};

const moveBox = (box: HTMLElement) => {
    const parentElement = box.parentNode as HTMLElement;
    const targetRowId = parentElement.id === 'row1' ? 'row2' : 'row1';
    const targetRow = document.getElementById(targetRowId) as HTMLElement;

    const rect = box.getBoundingClientRect();
    targetRow.appendChild(box);
    const newRect = box.getBoundingClientRect();

    box.style.transition = 'none';
    box.style.transform = `translate(${rect.left - newRect.left}px, ${rect.top - newRect.top}px)`;
    box.offsetWidth;  // Force reflow
    box.style.transition = 'transform 0.5s ease-in-out';
    box.style.transform = 'translate(0, 0)';

    if (targetRowId === 'row1') {
        box.classList.remove('hidden');
        box.querySelector('.right-icon')?.remove();
        box.style.opacity = '1';
        postMessage('removeFromIgnoreList', { item: box.querySelector('.text')?.textContent || '' });
    } else {
        if (!box.querySelector('.right-icon')) {
            const blueRegion = document.createElement('span');
            blueRegion.className = 'icon right-icon open-eye';
            blueRegion.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleEyeIcon(blueRegion);
            });
            box.appendChild(blueRegion);
        }
        postMessage('addToIgnoreList', { item: box.querySelector('.text')?.textContent || '' });
    }

    updateBoxStyles(box);
    updateFileTypes();
};

const updateBoxStyles = (box: HTMLElement) => {
    let blueRegion = box.querySelector('.right-icon') as HTMLElement;
    const textElement = box.querySelector('.text') as HTMLElement;
    const parentElement = box.parentNode as HTMLElement;

    if (parentElement.id === 'row2') {
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
        blueRegion?.remove();
        textElement.style.borderTopRightRadius = "var(--border-radius)";
        textElement.style.borderBottomRightRadius = "var(--border-radius)";
    }

    updateIconBackground(box);
};

const updateIconBackground = (box: HTMLElement) => {
    const iconElement = box.querySelector('.icon') as HTMLElement;
    const parentElement = box.parentNode as HTMLElement;
    iconElement.style.backgroundColor = parentElement.id === 'row2' && !iconElement.classList.contains('right-icon') ? 'var(--icon-bg-color-row2)' : 'var(--icon-bg-color)';
};

const toggleEyeIcon = (blueRegion: HTMLElement) => {
    const box = blueRegion.closest('.box') as HTMLElement;
    const parentElement = box.parentNode as HTMLElement;

    if (parentElement.id !== 'row2') return;

    const textElement = box.querySelector('.text') as HTMLElement;
    const itemValue = textElement.textContent || '';

    if (blueRegion.classList.contains('open-eye')) {
        blueRegion.classList.replace('open-eye', 'closed-eye');
        box.classList.add('hidden');
        box.style.opacity = '0.5';
        addToHideFoldersAndFiles(itemValue);
    } else {
        blueRegion.classList.replace('closed-eye', 'open-eye');
        box.classList.remove('hidden');
        box.style.opacity = '1';
        removeFromHideFoldersAndFiles(itemValue);
    }
};

const addToHideFoldersAndFiles = (item: string) => {
    const hiddenItems = getHiddenItems();
    if (!hiddenItems.includes(item)) {
        hiddenItems.push(item);
        setHiddenItems(hiddenItems);
    }
    postMessage('addToHideFoldersAndFiles', { item });
};

const removeFromHideFoldersAndFiles = (item: string) => {
    const hiddenItems = getHiddenItems();
    const index = hiddenItems.indexOf(item);
    if (index > -1) {
        hiddenItems.splice(index, 1);
        setHiddenItems(hiddenItems);
    }
    postMessage('removeFromHideFoldersAndFiles', { item });
};

const updateFileTypes = () => {
    const row1 = document.getElementById('row1');
    const row2 = document.getElementById('row2');

    if (!row1 || !row2) return;

    const activeFileTypes = Array.from(row1.querySelectorAll('.box .text')).map(el => el.textContent || '');
    const ignoredFileTypes = Array.from(row2.querySelectorAll('.box .text')).map(el => el.textContent || '');

    const hiddenStates: Record<string, boolean> = {};
    row2.querySelectorAll('.box').forEach(box => {
        const textElement = box.querySelector('.text');
        const rightIcon = box.querySelector('.right-icon');
        if (textElement && rightIcon) {
            hiddenStates[textElement.textContent!] = rightIcon.classList.contains('closed-eye');
        }
    });

    postMessage('updateFileTypes', { activeFileTypes, ignoredFileTypes });
    postMessage('updateHiddenStates', { hiddenStates });
};

const removeBox = (box: HTMLElement) => {
    box.remove();
    updateFileTypes();
};

const updateClipboardContent = (content: string = '') => {
    const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    clipboardDataBox.value = content;
    postMessage('requestCounts', { text: content });
};

const updateTokenCount = (count?: number) => {
    const tokenCountElement = document.getElementById('tokenCount') as HTMLInputElement;
    tokenCountElement.value = count?.toString() || '';
};

const updateCharCount = (count?: number) => {
    const charCountElement = document.getElementById('charCount') as HTMLInputElement;
    charCountElement.value = count?.toString() || '';
};

const requestFileTypes = () => postMessage('getFileTypes');

const requestHiddenFoldersAndFiles = () => postMessage('getHideFoldersAndFiles');

const getHiddenItems = (): string[] => JSON.parse(localStorage.getItem('hiddenItems') || '[]');

const setHiddenItems = (items: string[]) => localStorage.setItem('hiddenItems', JSON.stringify(items));

const updateHiddenBoxes = (hiddenItems: string[] = []) => {
    const row2 = document.getElementById('row2');
    if (!row2) return;

    row2.querySelectorAll('.box').forEach(box => {
        const textElement = box.querySelector('.text');
        const blueRegion = box.querySelector('.right-icon') as HTMLElement;
        const itemValue = textElement?.textContent || '';

        if (blueRegion) {
            if (hiddenItems.includes(itemValue)) {
                blueRegion.classList.replace('open-eye', 'closed-eye');
                (box as HTMLElement).classList.add('hidden');
                (box as HTMLElement).style.opacity = '0.5';
            } else {
                blueRegion.classList.replace('closed-eye', 'open-eye');
                (box as HTMLElement).classList.remove('hidden');
                (box as HTMLElement).style.opacity = '1';
            }
        }
    });
};