import './styles/webview.css';
import { Box } from './components/Box';

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();
let draggedElement: HTMLElement | null = null;
const placeholder = Object.assign(document.createElement('div'), { className: 'placeholder' });
let isDragging = false;
let initialCursorX = 0;
let lastPlaceholderPosition: HTMLElement | null = null;

const postMessage = (command: string, payload = {}) => vscode.postMessage({ command, ...payload });

const $ = (selector: string) => document.querySelector(selector);
const $$ = (selector: string) => Array.from(document.querySelectorAll(selector));

document.addEventListener('DOMContentLoaded', () => {
    initializeWebview();
    ['getFileTypes', 'getHideFoldersAndFiles'].forEach(postMessage);
});

const updateUI = ({ compressionLevel, clipboardDataBoxHeight }: { compressionLevel?: number, clipboardDataBoxHeight?: number }) => {
    $$('.compression-button').forEach(button => button.classList.remove('selected'));
    if (compressionLevel) $(`#compressionLevel${['Light', 'Medium', 'Hard'][compressionLevel - 1]}`)?.classList.add('selected');
    if (clipboardDataBoxHeight) ($("#clipboardDataBox") as HTMLTextAreaElement).style.height = `${clipboardDataBoxHeight}px`;
};

const messageHandlers: Record<string, (data: any) => void> = {
    initConfig: updateUI,
    configUpdated: updateUI,
    updateFileTypes: ({ fileTypes, fileTypesToIgnore }) => createBoxes(fileTypes, fileTypesToIgnore),
    updateHideFoldersAndFiles: ({ hideFoldersAndFiles }) => updateHiddenBoxes(hideFoldersAndFiles),
    updateClipboardDataBox: ({ content }) => updateClipboardContent(content),
    setTokenCount: ({ count }) => updateCount('tokenCount', count),
    setCharCount: ({ count }) => updateCount('charCount', count),
};

window.addEventListener('message', ({ data }) => messageHandlers[data.command]?.(data));

const initializeWebview = () => {
    setupListeners();
    setupButtons();
    setupDragAndDrop();
};

const setupListeners = () => {
    const clipboardDataBox = $('#clipboardDataBox') as HTMLTextAreaElement;
    document.addEventListener('mouseup', () => postMessage('setClipboardDataBoxHeight', { height: clipboardDataBox.offsetHeight }));
    clipboardDataBox.addEventListener('input', () => ['countTokens', 'countChars'].forEach(cmd => postMessage(cmd, { text: clipboardDataBox.value })));
};

const setupButtons = () => {
    ['Hard', 'Medium', 'Light'].forEach((level, index) => 
        $(`#compressionLevel${level}`)?.addEventListener('click', () => updateCompressionLevel(3 - index))
    );
    $('#openWebpageButton')?.addEventListener('click', () => postMessage('openWebpage'));
};

const updateCompressionLevel = (level: number) => postMessage('setCompressionLevel', { level });

const setupDragAndDrop = () => {
    $$('.row').forEach(row => {
        row.addEventListener('dragover', (event: Event) => handleDragOver(event as DragEvent));
        row.addEventListener('drop', (event: Event) => handleDrop(event as DragEvent));
    });
    ['mousedown', 'mouseup', 'click'].forEach(event => 
        document.addEventListener(event, (e: Event) => handleMouseEvents(e as MouseEvent))
    );
};

const handleMouseEvents = (event: MouseEvent) => {
    const box = (event.target as HTMLElement).closest('.box');
    if (!box || (event.target as HTMLElement).closest('.right-icon')) return;

    if (event.type === 'mousedown') {
        setTimeout(() => {
            isDragging = true;
            handleDragStart(event as unknown as DragEvent);
        }, 200);
    } else if (event.type === 'mouseup' && isDragging) {
        handleDragEnd();
    } else if (event.type === 'click' && !isDragging) {
        moveBox(box as HTMLElement);
    }
};

const handleDragStart = (event: DragEvent) => {
    draggedElement = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (!draggedElement) return;

    document.body.setAttribute('data-dragging', 'true');
    Object.assign(placeholder.style, { 
        width: `${draggedElement.offsetWidth}px`, 
        height: `${draggedElement.offsetHeight}px` 
    });
    initialCursorX = event.clientX;

    if (event.dataTransfer) {
        const dragImage = draggedElement.cloneNode(true) as HTMLElement;
        Object.assign(dragImage.style, { position: 'absolute', top: '-1000px', opacity: '1', pointerEvents: 'none' });
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
    }
};

const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest('.box') as HTMLElement;

    if (Math.abs(event.clientX - initialCursorX) > 10 && target && target !== draggedElement && target !== lastPlaceholderPosition) {
        const { y, height } = target.getBoundingClientRect();
        target.parentNode!.insertBefore(placeholder, event.clientY - y - height / 2 > 0 ? target.nextSibling : target);
        lastPlaceholderPosition = target;
    }
};

const handleDragEnd = () => {
    placeholder.remove();
    cleanupDragState();
};

const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (draggedElement && placeholder.parentNode) {
        placeholder.replaceWith(draggedElement);
        updateBoxStyles(draggedElement);
        updateFileTypes();
    }
    cleanupDragState();
};

const cleanupDragState = () => {
    draggedElement = null;
    isDragging = false;
    document.body.removeAttribute('data-dragging');
    lastPlaceholderPosition = null;
    $$('.box[style*="position: absolute"]').forEach(img => img.remove());
};

const createBoxes = (fileTypes: string[] = [], fileTypesToIgnore: string[] = []) => {
    ['row1', 'row2'].forEach((rowId, index) => {
        const row = $(`#${rowId}`);
        const template = $('#box-template') as HTMLTemplateElement;
        if (!row || !template) return;

        row.innerHTML = '';
        (index === 0 ? fileTypes : fileTypesToIgnore).forEach(type => {
            try {
                const box = new Box(template, type);
                const boxElement = box.getElement();
                boxElement.querySelector('.left-icon')?.classList.add(type.startsWith('.') ? 'icon-file' : 'icon-folder');
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
    const isMovingToRow2 = box.parentElement?.id === 'row1';
    const targetRow = $(`#row${isMovingToRow2 ? '2' : '1'}`);
    if (!targetRow) return;

    const rect = box.getBoundingClientRect();
    targetRow.appendChild(box);
    const newRect = box.getBoundingClientRect();

    box.style.transition = 'none';
    box.style.transform = `translate(${rect.left - newRect.left}px, ${rect.top - newRect.top}px)`;
    box.offsetHeight; // Force reflow
    box.style.transition = 'transform 0.5s ease-in-out';
    box.style.transform = 'translate(0, 0)';

    if (isMovingToRow2) {
        if (!box.querySelector('.right-icon')) {
            const blueRegion = Object.assign(document.createElement('span'), {
                className: 'icon right-icon open-eye',
                onclick: (event: Event) => {
                    event.stopPropagation();
                    toggleEyeIcon(blueRegion);
                }
            });
            box.appendChild(blueRegion);
        }
        postMessage('addToIgnoreList', { item: box.querySelector('.text')?.textContent || '' });
    } else {
        box.classList.remove('hidden');
        box.querySelector('.right-icon')?.remove();
        box.style.opacity = '1';
        postMessage('removeFromIgnoreList', { item: box.querySelector('.text')?.textContent || '' });
    }

    updateBoxStyles(box);
    updateFileTypes();
};

const updateBoxStyles = (box: HTMLElement) => {
    const textElement = box.querySelector('.text') as HTMLElement;
    const isRow2 = box.parentElement?.id === 'row2';

    if (isRow2) {
        if (!box.querySelector('.right-icon')) {
            const blueRegion = Object.assign(document.createElement('span'), {
                className: 'icon right-icon open-eye',
                onclick: (event: Event) => {
                    event.stopPropagation();
                    toggleEyeIcon(blueRegion);
                }
            });
            box.appendChild(blueRegion);
        }
        textElement.style.borderTopRightRadius = textElement.style.borderBottomRightRadius = "0";
    } else {
        box.querySelector('.right-icon')?.remove();
        textElement.style.borderTopRightRadius = textElement.style.borderBottomRightRadius = "var(--border-radius)";
    }

    (box.querySelector('.icon') as HTMLElement).style.backgroundColor = 
        isRow2 && !box.querySelector('.icon')?.classList.contains('right-icon') 
            ? 'var(--icon-bg-color-row2)' 
            : 'var(--icon-bg-color)';
};

const toggleEyeIcon = (blueRegion: HTMLElement) => {
    const box = blueRegion.closest('.box') as HTMLElement;
    if (box.parentElement?.id !== 'row2') return;

    const itemValue = box.querySelector('.text')?.textContent || '';
    const isHidden = blueRegion.classList.toggle('closed-eye');
    blueRegion.classList.toggle('open-eye', !isHidden);
    box.classList.toggle('hidden', isHidden);
    box.style.opacity = isHidden ? '0.5' : '1';
    
    (isHidden ? addToHideFoldersAndFiles : removeFromHideFoldersAndFiles)(itemValue);
};

const addToHideFoldersAndFiles = (item: string) => {
    const hiddenItems = getHiddenItems();
    if (!hiddenItems.includes(item)) {
        setHiddenItems([...hiddenItems, item]);
        postMessage('addToHideFoldersAndFiles', { item });
    }
};

const removeFromHideFoldersAndFiles = (item: string) => {
    const hiddenItems = getHiddenItems();
    const index = hiddenItems.indexOf(item);
    if (index > -1) {
        hiddenItems.splice(index, 1);
        setHiddenItems(hiddenItems);
        postMessage('removeFromHideFoldersAndFiles', { item });
    }
};

const updateFileTypes = () => {
    const getTypes = (rowId: string) => $$(`#${rowId} .box .text`).map(el => el.textContent || '');
    const [activeFileTypes, ignoredFileTypes] = ['row1', 'row2'].map(getTypes);

    const hiddenStates = Object.fromEntries(
        $$('#row2 .box').map(box => [
            box.querySelector('.text')?.textContent || '',
            box.querySelector('.right-icon')?.classList.contains('closed-eye') || false
        ])
    );

    postMessage('updateFileTypes', { activeFileTypes, ignoredFileTypes, hiddenStates });
};

const updateClipboardContent = (content: string = '') => {
    ($('#clipboardDataBox') as HTMLTextAreaElement).value = content;
    postMessage('requestCounts', { text: content });
};

const updateCount = (id: string, count?: number) => 
    ($(`#${id}`) as HTMLInputElement).value = count?.toString() || '';

const getHiddenItems = (): string[] => JSON.parse(localStorage.getItem('hiddenItems') || '[]');
const setHiddenItems = (items: string[]) => localStorage.setItem('hiddenItems', JSON.stringify(items));

const updateHiddenBoxes = (hiddenItems: string[] = []) => {
    $$('#row2 .box').forEach(box => {
        const itemValue = box.querySelector('.text')?.textContent || '';
        const blueRegion = box.querySelector('.right-icon') as HTMLElement;
        if (blueRegion) {
            const isHidden = hiddenItems.includes(itemValue);
            ['closed-eye', 'open-eye', 'hidden'].forEach(cls => 
                box.classList.toggle(cls, cls === 'hidden' ? isHidden : cls === 'closed-eye')
            );
            (box as HTMLElement).style.opacity = isHidden ? '0.5' : '1';
        }
    });
};