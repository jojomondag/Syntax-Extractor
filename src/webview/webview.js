import './styles/webview.css';
import { Box } from './components/Box';

const vscode = acquireVsCodeApi();
let draggedElement = null;
const placeholder = document.createElement('div');
placeholder.className = 'placeholder';
const clickAndHoldDuration = 200;
let clickTimeout;
let isClickAndHold = false;
let garbageIcon = null;
let isDragging = false;
let initialCursorX = 0;
let lastPlaceholderPosition = null;
const moveThreshold = 10;

const postMessage = (command, payload = {}) => {
    vscode.postMessage({ command, ...payload });
};

document.addEventListener('DOMContentLoaded', () => {
    initializeWebview();
    requestFileTypes();
    requestHiddenFoldersAndFiles();
});

window.addEventListener('message', (event) => {
    const message = event.data;
    console.log('Received message:', message);
    const handlers = {
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
    const clipboardDataBox = document.getElementById('clipboardDataBox');
    if (!clipboardDataBox) return;

    document.addEventListener('mouseup', () => {
        postMessage('setClipboardDataBoxHeight', { height: clipboardDataBox.offsetHeight });
    });
};

const setupTextInput = () => {
    const textarea = document.getElementById('clipboardDataBox');
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

const updateCompressionLevel = (level) => {
    console.log(`Sending compression level: ${level}`);
    postMessage('setCompressionLevel', { level });
};

const updateUI = (compressionLevel, clipboardDataBoxHeight) => {
    document.querySelectorAll('.compression-button').forEach(button => button.classList.remove('selected'));

    if (compressionLevel !== undefined) {
        const levelMap = ['compressionLevelLight', 'compressionLevelMedium', 'compressionLevelHard'];
        document.getElementById(levelMap[compressionLevel - 1])?.classList.add('selected');
    }

    if (clipboardDataBoxHeight !== undefined) {
        const clipboardDataBox = document.getElementById('clipboardDataBox');
        clipboardDataBox.style.height = `${clipboardDataBoxHeight}px`;
    }
};

const setupDragAndDrop = () => {
    document.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragover', (event) => handleDragOver(event));
        row.addEventListener('drop', (event) => handleDrop(event));
    });

    document.addEventListener('mousedown', handleMouseEvents);
    document.addEventListener('mouseup', handleMouseEvents);
    document.addEventListener('click', handleMouseEvents);
};

const setupGarbageIcon = () => {
    garbageIcon = document.querySelector('.garbage-icon');
    if (!garbageIcon) return;

    garbageIcon.addEventListener('dragover', (event) => handleGarbageEvent(event, 'over'));
    garbageIcon.addEventListener('dragleave', () => handleGarbageEvent(null, 'leave'));
    garbageIcon.addEventListener('drop', (event) => handleGarbageEvent(event, 'drop'));
};

const handleMouseEvents = (event) => {
    const box = event.target.closest('.box');
    if (!box || event.target.closest('.right-icon')) return;

    switch (event.type) {
        case 'mousedown':
            clickTimeout = window.setTimeout(() => {
                isClickAndHold = true;
                handleDragStart(event);
            }, clickAndHoldDuration);
            break;
        case 'mouseup':
            clearTimeout(clickTimeout);
            if (isClickAndHold) handleDragEnd(event);
            break;
        case 'click':
            clearTimeout(clickTimeout);
            if (!isClickAndHold) moveBox(box);
            break;
    }
};

const handleDragStart = (event) => {
    draggedElement = event.target.closest('.box');
    if (!draggedElement) return;

    isDragging = true;
    document.body.setAttribute('data-dragging', 'true');
    placeholder.style.width = `${draggedElement.offsetWidth}px`;
    placeholder.style.height = `${draggedElement.offsetHeight}px`;

    initialCursorX = event.clientX;

    if (event.dataTransfer) {
        const dragImage = draggedElement.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.opacity = '1';
        dragImage.style.pointerEvents = 'none';
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
    }
};

const handleDragOver = (event) => {
    event.preventDefault();
    const target = event.target.closest('.box');

    if (Math.abs(event.clientX - initialCursorX) > moveThreshold && target && target !== draggedElement && target !== lastPlaceholderPosition) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        target.parentNode.insertBefore(placeholder, event.clientY - offset > 0 ? target.nextSibling : target);
        lastPlaceholderPosition = target;
    }
};

const handleDragEnd = (event) => {
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    cleanupDragState();
};

const handleDrop = (event) => {
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

const handleGarbageEvent = (event, action) => {
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

const createBoxes = (fileTypes = [], fileTypesToIgnore = []) => {
    const rows = { row1: fileTypes, row2: fileTypesToIgnore };
    Object.entries(rows).forEach(([rowId, types]) => {
        const row = document.getElementById(rowId);
        if (!row) return;

        row.innerHTML = '';
        const template = document.getElementById('box-template');
        if (!template) return;

        types.forEach(type => {
            try {
                const box = new Box(template, type);
                const boxElement = box.getElement();
                boxElement.querySelector('.left-icon')?.classList.add(type.startsWith('.') ? 'icon-file' : 'icon-folder');
                row.appendChild(boxElement);
                box.updateBoxStyles();
                boxElement.__box_instance = box;

                if (rowId === 'row2') {
                    box.setVisibility(!getHiddenItems().includes(type));
                }
            } catch (error) {
                console.error(`Error creating box for ${type}:`, error);
            }
        });
    });
};

const moveBox = (box) => {
    const parentElement = box.parentNode;
    const targetRowId = parentElement.id === 'row1' ? 'row2' : 'row1';
    const targetRow = document.getElementById(targetRowId);

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

const updateBoxStyles = (box) => {
    let blueRegion = box.querySelector('.right-icon');
    const textElement = box.querySelector('.text');
    const parentElement = box.parentNode;

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

const updateIconBackground = (box) => {
    const iconElement = box.querySelector('.icon');
    const parentElement = box.parentNode;
    iconElement.style.backgroundColor = parentElement.id === 'row2' && !iconElement.classList.contains('right-icon') ? 'var(--icon-bg-color-row2)' : 'var(--icon-bg-color)';
};

const toggleEyeIcon = (blueRegion) => {
    const box = blueRegion.closest('.box');
    const parentElement = box.parentNode;

    if (parentElement.id !== 'row2') return;

    const textElement = box.querySelector('.text');
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

const addToHideFoldersAndFiles = (item) => {
    const hiddenItems = getHiddenItems();
    if (!hiddenItems.includes(item)) {
        hiddenItems.push(item);
        setHiddenItems(hiddenItems);
    }
    postMessage('addToHideFoldersAndFiles', { item });
};

const removeFromHideFoldersAndFiles = (item) => {
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

    const hiddenStates = {};
    row2.querySelectorAll('.box').forEach(box => {
        const textElement = box.querySelector('.text');
        const rightIcon = box.querySelector('.right-icon');
        if (textElement && rightIcon) {
            hiddenStates[textElement.textContent] = rightIcon.classList.contains('closed-eye');
        }
    });

    postMessage('updateFileTypes', { activeFileTypes, ignoredFileTypes });
    postMessage('updateHiddenStates', { hiddenStates });
};

const removeBox = (box) => {
    box.remove();
    updateFileTypes();
};

const updateClipboardContent = (content = '') => {
    const clipboardDataBox = document.getElementById('clipboardDataBox');
    clipboardDataBox.value = content;
    postMessage('requestCounts', { text: content });
};

const updateTokenCount = (count)